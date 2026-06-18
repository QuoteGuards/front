export const MOCK_QUOTE = {
  id: 'QT-2026-00123',
  status: '승인완료',
  createdAt: '2026-06-10',
  validUntil: '2026-07-10',
  approvedAt: '2026-06-12',

  seller: {
    companyName: '(주)퀀트솔루션',
    representative: '김대표',
    businessNumber: '123-45-67890',
    address: '서울특별시 강남구 테헤란로 123, 10층',
    tel: '02-1234-5678',
    email: 'sales@quantsolution.co.kr',
  },

  buyer: {
    companyName: '(주)미래산업',
    contactName: '이담당',
    department: '구매팀',
    tel: '02-9876-5432',
    email: 'lee@miraeindustry.co.kr',
  },

  items: [
    {
      id: 1,
      name: 'ERP 시스템 라이선스 (Enterprise)',
      spec: '사용자 50명, 1년 구독',
      unit: '식',
      qty: 1,
      unitPrice: 24000000,
    },
    {
      id: 2,
      name: '구축 용역',
      spec: '기본 세팅 및 데이터 마이그레이션',
      unit: '건',
      qty: 1,
      unitPrice: 8000000,
    },
    {
      id: 3,
      name: '교육 서비스',
      spec: '사용자 교육 (2회, 각 4시간)',
      unit: '회',
      qty: 2,
      unitPrice: 1500000,
    },
    {
      id: 4,
      name: '유지보수 지원 (1년)',
      spec: '기술지원 + 업데이트 포함',
      unit: '년',
      qty: 1,
      unitPrice: 3600000,
    },
  ],

  note: '본 견적서는 발행일로부터 30일간 유효합니다.\n계약 조건 및 결제 방식은 별도 협의 후 확정됩니다.\n부가세 10%가 포함된 금액입니다.',
}

export const calcQuoteSummary = (items) => {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0)
  const tax = Math.round(subtotal * 0.1)
  const total = subtotal + tax
  return { subtotal, tax, total }
}

export const formatKRW = (amount) => amount.toLocaleString('ko-KR') + '원'
