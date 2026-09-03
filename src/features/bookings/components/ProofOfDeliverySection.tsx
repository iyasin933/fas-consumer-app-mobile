import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import { isAxiosError } from 'axios';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import {
  downloadPodDocument,
  fetchPod,
  fetchPodDocuments,
  type PodDocumentInfo,
} from '@/api/modules/dropyou.api';
import { useTheme } from '@/hooks/useTheme';
import { InteractiveEmptyState } from '@/shared/components/InteractiveEmptyState';
import { Skeleton } from '@/shared/components/Skeleton';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  loadId: string;
};

type ObjectRecord = Record<string, unknown>;

function asRecord(value: unknown): ObjectRecord | null {
  return value && typeof value === 'object' ? (value as ObjectRecord) : null;
}

function valueAt(value: unknown, keys: string[]): string {
  const record = asRecord(value);
  if (!record) return '—';
  const raw = keys.map((key) => record[key]).find((entry) => entry != null && entry !== '');
  if (raw == null || raw === '') return '—';
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed || '—';
  }
  return '—';
}

function formatDeliveredOn(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace('T', ' ').replace('Z', '') || '—';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(date);
  } catch {
    return value;
  }
}

function extensionFromMime(contentType?: string): string | null {
  const mime = (contentType ?? '').split(';')[0].trim().toLowerCase();
  if (mime === 'application/pdf') return '.pdf';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/jpeg' || mime === 'image/jpg') return '.jpg';
  if (mime === 'image/gif') return '.gif';
  return null;
}

function podFileName(
  document: PodDocumentInfo,
  contentType: string,
  headerName: string | null,
): string {
  let name = (headerName || document.name || `POD_${document.id}`).trim();
  name = name.replace(/[\\/:*?"<>|#%]/g, '-').trim();
  if (name.length > 80) name = name.slice(-80);
  if (!/\.[a-zA-Z0-9]{1,5}$/.test(name)) {
    const ext = extensionFromMime(contentType || document.documentType);
    if (ext) name += ext;
  }
  return name;
}

function formatSize(size?: number): string {
  if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) return '';
  return `(${(size / 1024).toFixed(2)} KB)`;
}

function weightLabel(record: unknown): string {
  const weight = valueAt(record, ['weight']);
  const unit = valueAt(record, ['weightUnit']);
  if (weight === '—') return '—';
  return unit === '—' ? weight : `${weight} ${unit}`;
}

function createStyles(colors: ThemeColors, narrow: boolean) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    header: {
      minHeight: narrow ? 52 : 60,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    headerPressed: {
      backgroundColor: colors.background,
    },
    iconBubble: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary + '18',
    },
    headerCopy: {
      flex: 1,
      minWidth: 0,
      gap: 1,
    },
    headerTitle: {
      color: colors.textPrimary,
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.bold,
    },
    headerSub: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.xs,
      lineHeight: 16,
    },
    body: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      gap: spacing.md,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    fieldList: {
      gap: spacing.sm,
      paddingTop: spacing.sm,
    },
    fieldRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    fieldLabel: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.sm,
      fontWeight: '700',
      flexShrink: 0,
    },
    fieldValue: {
      color: colors.textPrimary,
      fontSize: typography.fontSize.sm,
      lineHeight: 19,
      fontWeight: typography.fontWeight.bold,
      flexShrink: 1,
      textAlign: 'right',
    },
    docsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    docsTitle: {
      color: colors.textPrimary,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.bold,
    },
    docRow: {
      minHeight: narrow ? 44 : 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    docIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    docCopy: {
      flex: 1,
      minWidth: 0,
    },
    docName: {
      color: colors.textPrimary,
      fontSize: typography.fontSize.sm,
      fontWeight: '700',
    },
    docSize: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.xs,
      marginTop: 1,
    },
    downloadButton: {
      width: narrow ? 36 : 40,
      height: narrow ? 36 : 40,
      borderRadius: narrow ? 18 : 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary + '14',
    },
    downloadPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.96 }],
    },
  });
}

export function ProofOfDeliverySection({ loadId }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const narrow = width < 380;
  const styles = useMemo(() => createStyles(colors, narrow), [colors, narrow]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pod, setPod] = useState<unknown>(null);
  const [documents, setDocuments] = useState<PodDocumentInfo[]>([]);
  const [downloadingId, setDownloadingId] = useState<number | string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [podResponse, documentsResponse] = await Promise.all([
        fetchPod(loadId),
        fetchPodDocuments(loadId),
      ]);
      setPod(podResponse);
      setDocuments(documentsResponse);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 404) {
        setPod(null);
        setDocuments([]);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load proof of delivery.');
      }
    } finally {
      setLoading(false);
    }
  }, [loadId]);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      if (next && !pod && !loading && !error) {
        void load();
      }
      return next;
    });
  }, [error, load, loading, pod]);

  const handleDownload = useCallback(
    async (document: PodDocumentInfo) => {
      setDownloadingId(document.id);
      try {
        const { bytes, contentType, fileName } = await downloadPodDocument(
          loadId,
          document.id,
        );
        const name = podFileName(document, contentType, fileName);
        const file = new File(Paths.cache, name);
        if (file.exists) file.delete();
        file.create();
        file.write(bytes);

        await Share.share({
          title: name,
          url: file.uri,
          message: file.uri,
        });
      } catch (err) {
        Alert.alert(
          'Download POD',
          err instanceof Error ? err.message : 'Failed to download this file.',
        );
      } finally {
        setDownloadingId(null);
      }
    },
    [loadId],
  );

  const hasPod = Boolean(pod);
  const podRecord = asRecord(pod);
  const deliveredOn = formatDeliveredOn(
    podRecord && typeof podRecord.deliveredOn === 'string' ? podRecord.deliveredOn : null,
  );
  const deliveryStatus = valueAt(pod, ['deliveryStatus']);
  const headerSub = hasPod
    ? `Delivered on ${deliveredOn === '—' ? deliveryStatus : deliveredOn}`
    : 'Details and files appear once the driver submits proof.';

  return (
    <View style={styles.card}>
      <Pressable
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel="Proof of delivery"
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        <View style={styles.iconBubble}>
          <Ionicons name="receipt-outline" size={18} color={colors.primary} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Proof of delivery</Text>
          <Text numberOfLines={1} style={styles.headerSub}>
            {headerSub}
          </Text>
        </View>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </Pressable>

      {open ? (
        <Animated.View entering={FadeIn.duration(200)}>
          <View style={styles.divider} />
          {loading ? (
            <View style={styles.body}>
              {[0, 1, 2].map((item) => (
                <Skeleton key={item} width="100%" height={18} />
              ))}
            </View>
          ) : error ? (
            <InteractiveEmptyState
              compact
              eyebrow="Could not load"
              title="Proof of delivery unavailable"
              body="We could not load the proof of delivery right now."
              icon="cloud-offline-outline"
              primaryAction={{
                label: 'Try again',
                icon: 'refresh',
                onPress: () => void load(),
              }}
              style={{ paddingVertical: spacing.sm }}
            />
          ) : hasPod ? (
            <View style={styles.body}>
              <View style={styles.fieldList}>
                <FieldRow
                  label="Received by"
                  value={valueAt(pod, ['receivedBy'])}
                  styles={styles}
                />
                <FieldRow
                  label="No of items"
                  value={valueAt(pod, ['noOfItems'])}
                  styles={styles}
                />
                <FieldRow label="Weight" value={weightLabel(pod)} styles={styles} />
                <FieldRow label="Delivered on" value={deliveredOn} styles={styles} />
                <FieldRow
                  label="Delivery status"
                  value={valueAt(pod, ['deliveryStatus'])}
                  styles={styles}
                />
                <FieldRow label="Notes" value={valueAt(pod, ['notes'])} styles={styles} />
              </View>

              <View style={styles.docsHeader}>
                <Text style={styles.docsTitle}>
                  Documents{documentCount(documents)}
                </Text>
              </View>

              {documents.length === 0 ? (
                <InteractiveEmptyState
                  compact
                  eyebrow="Nothing yet"
                  title="No POD files"
                  body="The driver has not uploaded any proof files for this delivery."
                  icon="document-text-outline"
                  style={{ paddingVertical: spacing.xs }}
                />
              ) : (
                documents.map((document) => {
                  const downloading = downloadingId === document.id;
                  return (
                    <View key={String(document.id)} style={styles.docRow}>
                      <View style={styles.docIcon}>
                        <Ionicons
                          name="document-text"
                          size={17}
                          color={colors.textPrimary}
                        />
                      </View>
                      <View style={styles.docCopy}>
                        <Text numberOfLines={1} style={styles.docName}>
                          {document.name || `POD_${document.id}`}
                        </Text>
                        {formatSize(document.size) ? (
                          <Text style={styles.docSize}>{formatSize(document.size)}</Text>
                        ) : null}
                      </View>
                      <Pressable
                        style={({ pressed }) => [
                          styles.downloadButton,
                          pressed && styles.downloadPressed,
                          downloading && { opacity: 0.6 },
                        ]}
                        onPress={() => void handleDownload(document)}
                        disabled={downloading}
                        accessibilityRole="button"
                        accessibilityLabel={`Download ${document.name || 'POD file'}`}
                      >
                        {downloading ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <Ionicons
                            name="download-outline"
                            size={19}
                            color={colors.primary}
                          />
                        )}
                      </Pressable>
                    </View>
                  );
                })
              )}
            </View>
          ) : (
            <InteractiveEmptyState
              compact
              eyebrow="No POD yet"
              title="Proof of delivery not submitted"
              body="Once the driver completes this delivery and submits proof, details and documents will appear here."
              icon="document-text-outline"
              style={{ paddingVertical: spacing.sm }}
            />
          )}
        </Animated.View>
      ) : null}
    </View>
  );
}

function documentCount(documents: PodDocumentInfo[]): string {
  return documents.length > 0 ? ` (${documents.length})` : '';
}

function FieldRow({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}
