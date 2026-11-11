/**
 * VietQR transfer codes, rendered by the public VietQR Quick Link image API
 * (https://www.vietqr.io/danh-sach-api/link-tao-ma-nhanh). The bank is
 * identified by its NAPAS BIN.
 */
export const BANKS: { bin: string; short: string; name: string }[] = [
  { bin: '970436', short: 'Vietcombank', name: 'Ngoại thương Việt Nam' },
  { bin: '970415', short: 'VietinBank', name: 'Công thương Việt Nam' },
  { bin: '970418', short: 'BIDV', name: 'Đầu tư và Phát triển Việt Nam' },
  { bin: '970405', short: 'Agribank', name: 'Nông nghiệp và Phát triển Nông thôn' },
  { bin: '970407', short: 'Techcombank', name: 'Kỹ Thương Việt Nam' },
  { bin: '970422', short: 'MB Bank', name: 'Quân đội' },
  { bin: '970416', short: 'ACB', name: 'Á Châu' },
  { bin: '970432', short: 'VPBank', name: 'Việt Nam Thịnh Vượng' },
  { bin: '970423', short: 'TPBank', name: 'Tiên Phong' },
  { bin: '970403', short: 'Sacombank', name: 'Sài Gòn Thương Tín' },
  { bin: '970441', short: 'VIB', name: 'Quốc tế Việt Nam' },
  { bin: '970437', short: 'HDBank', name: 'Phát triển TP.HCM' },
  { bin: '970443', short: 'SHB', name: 'Sài Gòn – Hà Nội' },
  { bin: '970426', short: 'MSB', name: 'Hàng Hải Việt Nam' },
  { bin: '970448', short: 'OCB', name: 'Phương Đông' },
  { bin: '970440', short: 'SeABank', name: 'Đông Nam Á' },
  { bin: '970431', short: 'Eximbank', name: 'Xuất Nhập khẩu Việt Nam' },
  { bin: '970449', short: 'LPBank', name: 'Lộc Phát Việt Nam' },
  { bin: '970428', short: 'Nam A Bank', name: 'Nam Á' },
  { bin: '970409', short: 'Bac A Bank', name: 'Bắc Á' },
  { bin: '970425', short: 'ABBANK', name: 'An Bình' },
  { bin: '970412', short: 'PVcomBank', name: 'Đại Chúng Việt Nam' },
  { bin: '970452', short: 'KienlongBank', name: 'Kiên Long' },
  { bin: '546034', short: 'Cake', name: 'Cake by VPBank' },
];

export function bankShortName(bin: string | null): string | null {
  return BANKS.find((b) => b.bin === bin)?.short ?? null;
}

export function vietQrImageUrl(p: {
  bin: string;
  accountNo: string;
  accountName?: string | null;
  amount?: number;
  info?: string;
}): string {
  const params = new URLSearchParams();
  if (p.amount && p.amount > 0) params.set('amount', String(p.amount));
  if (p.info) params.set('addInfo', p.info.slice(0, 50));
  if (p.accountName) params.set('accountName', p.accountName);
  return `https://img.vietqr.io/image/${p.bin}-${encodeURIComponent(p.accountNo)}-compact2.png?${params.toString()}`;
}
