import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { DatePickerModal } from '@/features/map/components/DatePickerModal';

export type SchedulePickerConfig = {
  mode: 'date' | 'time';
  value: Date;
  minimumDate?: Date;
  title?: string;
  onConfirm: (d: Date) => void;
  onCancel: () => void;
};

const Ctx = createContext<{ openPicker: (c: SchedulePickerConfig) => void } | null>(null);

/**
 * Hosts the schedule date/time UI at the Map screen root so it stacks above
 * @gorhom/bottom-sheet (RN Modal does not — see PlacesAutocompleteModal).
 */
export function ScheduleDateTimePickerProvider({ children }: { children: ReactNode }) {
  const [cfg, setCfg] = useState<SchedulePickerConfig | null>(null);

  const openPicker = useCallback((c: SchedulePickerConfig) => {
    if (__DEV__) {
      console.log('[Map schedule] picker open', {
        mode: c.mode,
        value: c.value.toISOString(),
        title: c.title,
      });
    }
    setCfg(c);
  }, []);

  const close = useCallback(() => setCfg(null), []);

  const ctx = useMemo(() => ({ openPicker }), [openPicker]);

  return (
    <Ctx.Provider value={ctx}>
      <Fragment>
        {children}
        {cfg ? (
          <DatePickerModal
            visible
            mode={cfg.mode}
            value={cfg.value}
            minimumDate={cfg.minimumDate}
            title={cfg.title}
            onCancel={() => {
              if (__DEV__) console.log('[Map schedule] picker cancel', { mode: cfg.mode });
              cfg.onCancel();
              close();
            }}
            onConfirm={(d) => {
              if (__DEV__) {
                console.log('[Map schedule] picker confirm', {
                  mode: cfg.mode,
                  iso: d.toISOString(),
                });
              }
              cfg.onConfirm(d);
              close();
            }}
          />
        ) : null}
      </Fragment>
    </Ctx.Provider>
  );
}

export function useScheduleDateTimePicker() {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error('useScheduleDateTimePicker must be used within ScheduleDateTimePickerProvider');
  }
  return v;
}
