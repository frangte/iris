import * as Clipboard from 'expo-clipboard';
import { Stack } from 'expo-router';
import { Platform, Share, StyleSheet, View } from 'react-native';

import type { Invite } from '@shared/domain';
import { useToast } from '@/components/toast';
import { Button, ErrorNote, Row, Screen, Section, SkeletonRows, T } from '@/components/ui';
import { confirm } from '@/lib/dialog';
import { useCreateInvite, useInvites, useMembers, useRemoveMember, useRevokeInvite } from '@/lib/queries';
import { useSession, useShop } from '@/lib/session';
import { Radius, Space, useColors } from '@/lib/theme';

const ROLE_LABEL = { owner: 'Chủ shop', manager: 'Quản lý' } as const;

export default function Members() {
  const shop = useShop();
  const { me } = useSession();
  const members = useMembers();
  const invites = useInvites();
  const createInvite = useCreateInvite();
  const revoke = useRevokeInvite();
  const remove = useRemoveMember();
  const isOwner = shop.role === 'owner';

  return (
    <>
      <Stack.Screen options={{ title: 'Thành viên', headerLargeTitleEnabled: false }} />
      <Screen refreshing={members.isRefetching} onRefresh={() => (members.refetch(), invites.refetch())}>
        {members.isPending ? <SkeletonRows count={2} /> : null}
        {members.data ? (
          <Section title={`${members.data.length} người trong ${shop.name}`} footer={isOwner ? 'Chỉ chủ shop xoá được thành viên.' : undefined}>
            {members.data.map((m) => {
              const isMe = m.userId === me?.user.id;
              const canRemove = isOwner && !isMe;
              return (
                <Row
                  key={m.userId}
                  icon="person"
                  title={`${m.name ?? m.email}${isMe ? ' (bạn)' : ''}`}
                  subtitle={m.name ? `${m.email} · ${ROLE_LABEL[m.role]}` : ROLE_LABEL[m.role]}
                  detail={
                    canRemove ? (
                      <Button
                        title="Xoá"
                        variant="plain"
                        small
                        onPress={async () => {
                          const ok = await confirm({
                            title: `Xoá ${m.name ?? m.email} khỏi shop?`,
                            message: 'Người này sẽ không xem được đơn của shop nữa.',
                            confirm: 'Xoá',
                            destructive: true,
                          });
                          if (ok) remove.mutate(m.userId);
                        }}
                      />
                    ) : undefined
                  }
                />
              );
            })}
          </Section>
        ) : null}
        {remove.error ? <ErrorNote error={remove.error} /> : null}

        <Section
          title="Mời quản lý"
          footer="Mã dùng được 7 ngày, cho nhiều người. Người được mời đăng nhập Floied rồi nhập mã, hoặc mở link.">
          {(invites.data ?? []).map((inv) => (
            <InviteCard
              key={inv.id}
              invite={inv}
              shopName={shop.name}
              onRevoke={async () => {
                if (await confirm({ title: `Thu hồi mã ${inv.code}?`, confirm: 'Thu hồi', destructive: true })) revoke.mutate(inv.id);
              }}
            />
          ))}
          <Row icon="ticket" title={<T tone="tint">Tạo mã mời</T>} onPress={() => createInvite.mutate()} />
        </Section>
        {createInvite.error ? <ErrorNote error={createInvite.error} /> : null}
      </Screen>
    </>
  );
}

function InviteCard({ invite, shopName, onRevoke }: { invite: Invite; shopName: string; onRevoke: () => void }) {
  const c = useColors();
  const toast = useToast();
  const link = `floied://join/${invite.code}`;
  const message = `Mời bạn cùng quản lý ${shopName} trên Floied.\nMã mời: ${invite.code}\nHoặc mở: ${link}`;
  const expires = new Date(invite.expiresAt);
  const share = async () => {
    if (Platform.OS === 'web' && !navigator.share) {
      await Clipboard.setStringAsync(message);
      toast('Đã chép lời mời');
      return;
    }
    Share.share({ message });
  };
  return (
    <View style={styles.invite}>
      <View style={[styles.codeBox, { backgroundColor: c.fill }]} accessible accessibilityLabel={`Mã mời ${invite.code.split('').join(' ')}`}>
        <T variant="title1" money selectable style={styles.code}>
          {invite.code}
        </T>
      </View>
      <T variant="footnote" tone="secondary">
        {`Hết hạn ${expires.getDate()}/${expires.getMonth() + 1} · đã dùng ${invite.uses} lần`}
      </T>
      <View style={styles.inviteActions}>
        <Button title="Gửi mã" icon="share" small onPress={share} style={{ flex: 1 }} />
        <Button title="Thu hồi" variant="plain" small onPress={onRevoke} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  invite: { padding: Space.lg, gap: Space.sm },
  codeBox: { borderRadius: Radius.control, paddingVertical: Space.md, alignItems: 'center' },
  code: { letterSpacing: 6 },
  inviteActions: { flexDirection: 'row', gap: Space.sm, marginTop: Space.xs },
});
