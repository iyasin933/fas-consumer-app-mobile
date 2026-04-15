import { StyleSheet, View } from 'react-native';

import { UsersListView } from '@/components/users/UsersListView';
import { useUsers } from '@/hooks/queries/useUsers';
import { Screen } from '@/shared/components/Screen';
import { toApiClientError } from '@/types/api.types';

export function UsersScreen() {
  const { data, isPending, isError, error, refetch, isRefetching } = useUsers({
    page: 1,
    take: 20,
  });

  const users = Array.isArray(data?.results) ? data.results : [];

  return (
    <Screen>
      <View style={styles.flex}>
        <UsersListView
          users={users}
          loading={isPending}
          error={isError ? toApiClientError(error).message : null}
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
