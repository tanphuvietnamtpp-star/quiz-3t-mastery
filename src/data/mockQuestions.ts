import { Question } from '../types';

export const INITIAL_QUESTIONS: Question[] = [
  {
    id: 'q1',
    text: 'Nguyên tắc cốt lõi đầu tiên trong tinh thần "3T" là gì?',
    options: [
      'Tự ý thực hiện công việc không cần hướng dẫn',
      'Tự giác tuân thủ tuyệt đối các quy định an toàn lao động và nội quy công ty',
      'Tự quyết định mọi thay đổi trong dây chuyền sản xuất',
      'Tự tìm hiểu công việc khi xảy ra sự cố nguy hiểm'
    ],
    correctAnswerIndex: 1,
    explanation: 'Tự giác là nền tảng của 3T. Mỗi cán bộ nhân viên cần tự giác chấp hành nghiêm túc quy trình, không đợi nhắc nhở.'
  },
  {
    id: 'q2',
    text: 'Khi phát hiện một thiết bị máy móc có dấu hiệu rò điện hoặc hoạt động bất thường, hành động nào đúng chuẩn 3T?',
    options: [
      'Vẫn tiếp tục làm việc để đảm bảo kịp tiến độ sản xuất',
      'Tự tháo máy ra sửa chữa mà không cần báo kỹ thuật',
      'Cắt nguồn điện ngay lập tức, treo biển cảnh báo nguy hiểm và báo cáo ngay cho tổ trưởng/bộ phận cơ điện',
      'Chờ đến hết ca làm việc mới thông báo cho ca sau'
    ],
    correctAnswerIndex: 2,
    explanation: 'An toàn là trên hết. Khi phát hiện sự cố, phải cắt điện, cảnh báo và báo bộ phận chuyên trách để xử lý kỹ thuật.'
  },
  {
    id: 'q3',
    text: 'Chữ "T" thứ hai trong triết lý "3T" của chúng ta có ý nghĩa là gì?',
    options: [
      'Tự quản - Quản lý tốt khu vực làm việc, công cụ dụng cụ và kỷ luật của bản thân',
      'Tự tin - Luôn thực hiện công việc theo ý mình',
      'Tự đắc - Cho rằng mình luôn làm đúng mọi quy trình',
      'Tự phát - Thích làm giờ nào thì làm việc giờ đó'
    ],
    correctAnswerIndex: 0,
    explanation: 'Chữ T thứ hai là Tự quản. Tự quản lý khu vực làm việc sạch sẽ (5S), bảo quản dụng cụ tốt và tự rèn kỷ luật cao.'
  },
  {
    id: 'q4',
    text: 'Người lao động có trách nhiệm gì đối với phương tiện bảo vệ cá nhân (BHLĐ) được cấp phát?',
    options: [
      'Có quyền không đeo nếu cảm thấy vướng víu hoặc nóng nực',
      'Tự mang về nhà làm đồ dùng cá nhân riêng',
      'Phải sử dụng đúng cách, bảo quản cẩn thận trong suốt quá trình làm việc tại xưởng',
      'Chỉ đeo khi thấy có cán bộ kiểm tra chất lượng đi qua'
    ],
    correctAnswerIndex: 2,
    explanation: 'Bảo hộ lao động bảo vệ tính mạng của chính bạn. Phải dùng đúng quy trình và bảo quản chu đáo mọi lúc mọi nơi.'
  },
  {
    id: 'q5',
    text: 'Chữ "T" thứ ba trong triết lý "3T" thể hiện trách nhiệm nào của người lao động?',
    options: [
      'Tự chịu trách nhiệm về chất lượng sản phẩm mình làm ra và hành vi an toàn của bản thân',
      'Tự báo cáo thành tích của người khác thành của mình',
      'Tự đổ lỗi cho máy móc khi xảy ra sai sót hoặc sản phẩm hỏng',
      'Tự ý bỏ ca làm việc khi cảm thấy mệt mỏi mà không báo cáo'
    ],
    correctAnswerIndex: 0,
    explanation: 'Chữ T thứ ba là Tự chịu trách nhiệm. Chịu trách nhiệm 100% với chất lượng công việc mình bàn giao và sự an toàn của mình.'
  },
  {
    id: 'q6',
    text: 'Quy tắc 5S tại nơi sản xuất bao gồm những hoạt động nào sau đây?',
    options: [
      'Sạch sẽ, Sang trọng, Sáng tạo, Sẵn sàng, Sừng sững',
      'Sàng lọc, Sắp xếp, Sạch sẽ, Săn sóc, Sẵn sàng',
      'Sơ sài, Sắp đặt, Sửa soạn, Sát sao, Sam sưa',
      'Sản xuất, Siêng năng, Sơ cứu, Sơ tuyển, Song hành'
    ],
    correctAnswerIndex: 1,
    explanation: '5S là nền tảng sản xuất sạch sẽ, an toàn: Sàng lọc (Seiri), Sắp xếp (Seiton), Sạch sẽ (Seiso), Săn sóc (Seiketsu), Sẵn sàng (Shitsuke).'
  },
  {
    id: 'q7',
    text: 'Trước khi bắt đầu vận hành bất kỳ một máy móc mới nào, hành động nào là bắt buộc?',
    options: [
      'Bấm nút chạy thử ngay xem máy có hoạt động hay không',
      'Đọc kỹ hướng dẫn vận hành, kiểm tra độ an toàn của máy và trang bị đầy đủ bảo hộ lao động cá nhân',
      'Hỏi người làm bên cạnh xem vận hành thế nào rồi làm theo',
      'Cứ vận hành thoải mái, khi nào máy hỏng thì dừng lại'
    ],
    correctAnswerIndex: 1,
    explanation: 'Phải đọc kỹ hướng dẫn vận hành và kiểm tra an toàn toàn diện trước khi khởi động máy để phòng ngừa mọi rủi ro.'
  }
];
