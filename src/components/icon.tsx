import { SymbolView } from 'expo-symbols';
import type { ColorValue } from 'react-native';

/** SF Symbols on iOS, Material Symbols on Android and web. */
const ICONS = {
  plus: { ios: 'plus', android: 'add', web: 'add' },
  chevron: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  phone: { ios: 'phone.fill', android: 'call', web: 'call' },
  message: { ios: 'message.fill', android: 'chat', web: 'chat' },
  map: { ios: 'map.fill', android: 'map', web: 'map' },
  copy: { ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' },
  share: { ios: 'square.and.arrow.up', android: 'share', web: 'share' },
  trash: { ios: 'trash', android: 'delete', web: 'delete' },
  person: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
  people: { ios: 'person.2.fill', android: 'group', web: 'group' },
  bank: { ios: 'building.columns', android: 'account_balance', web: 'account_balance' },
  storefront: { ios: 'storefront', android: 'storefront', web: 'storefront' },
  scooter: { ios: 'scooter', android: 'two_wheeler', web: 'two_wheeler' },
  bag: { ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' },
  check: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  clock: { ios: 'clock', android: 'schedule', web: 'schedule' },
  qr: { ios: 'qrcode', android: 'qr_code_2', web: 'qr_code_2' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
  ticket: { ios: 'ticket', android: 'confirmation_number', web: 'confirmation_number' },
  minus: { ios: 'minus', android: 'remove', web: 'remove' },
  close: { ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' },
  flower: { ios: 'camera.macro', android: 'local_florist', web: 'local_florist' },
  swap: { ios: 'arrow.left.arrow.right', android: 'swap_horiz', web: 'swap_horiz' },
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color: ColorValue }) {
  // SymbolView's name type is a literal union per platform; the table above is the source of truth.
  return <SymbolView name={ICONS[name] as never} size={size} tintColor={color as string} />;
}
