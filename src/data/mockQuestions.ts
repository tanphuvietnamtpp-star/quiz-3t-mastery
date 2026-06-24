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
  },
  {
    id: 'q8',
    text: 'Khẩu hiệu (Slogan) hành động gắn liền với Văn hóa 3T của Tân Phú Việt Nam là gì?',
    options: [
      'Đoàn kết là sức mạnh - Phát triển là thành công',
      'Tốc độ là sống còn - Tinh gọn là sức mạnh',
      'Chất lượng hàng đầu - Khách hàng là trọng tâm',
      'An toàn trên hết - Hiệu quả bền lâu'
    ],
    correctAnswerIndex: 1,
    explanation: '"Tốc độ là sống còn - Tinh gọn là sức mạnh" là kim chỉ nam hành động của Văn hóa 3T Tân Phú Việt Nam.'
  },
  {
    id: 'q9',
    text: 'Yếu tố cốt lõi nào giúp thúc đẩy tinh thần "Tốc độ là sống còn" trong giải quyết công việc?',
    options: [
      'Giải quyết công việc chậm rãi để tránh mọi rủi ro nhỏ nhất',
      'Phối hợp nhanh chóng giữa các bộ phận, phản hồi thông tin kịp thời và không đùn đẩy trách nhiệm',
      'Làm việc vội vàng, bỏ qua các bước kiểm tra chất lượng sản phẩm',
      'Chờ đợi sự chỉ đạo trực tiếp của cấp trên trước khi xử lý mọi việc phát sinh'
    ],
    correctAnswerIndex: 1,
    explanation: 'Để đạt tốc độ tối ưu, việc phối hợp nhanh chóng, thông tin thông suốt và tinh thần chủ động hành động giữa các bộ phận là cực kỳ quan trọng.'
  },
  {
    id: 'q10',
    text: 'Trong hoạt động sản xuất và vận hành, tinh thần "Tinh gọn là sức mạnh" hướng tới điều gì?',
    options: [
      'Sử dụng nguyên vật liệu rẻ tiền để cắt giảm tối đa chi phí',
      'Loại bỏ các lãng phí (thời gian chờ, thao tác thừa, phế phẩm...) và tối ưu hóa quy trình làm việc',
      'Giảm bớt số lượng nhân sự đến mức tối thiểu khiến công việc bị quá tải',
      'Bỏ qua các bước báo cáo, ghi chép số liệu sản xuất hàng ngày'
    ],
    correctAnswerIndex: 1,
    explanation: 'Tinh gọn (Lean) tập trung vào việc nhận diện, loại bỏ các loại lãng phí trong vận hành và liên tục tối ưu hóa quy trình nhằm nâng cao giá trị cho khách hàng.'
  },
  {
    id: 'q11',
    text: 'Khi bạn phát hiện ra một cải tiến (Kaizen) giúp rút ngắn thời gian làm việc hoặc tăng tính an toàn, bạn nên làm gì?',
    options: [
      'Giữ kín làm bí quyết riêng để bản thân được nhàn rỗi hơn',
      'Cứ âm thầm thay đổi quy trình vận hành của máy mà không cần xin phép ai',
      'Mạnh dạn đề xuất giải pháp với Tổ trưởng hoặc Ban cải tiến thông qua chương trình Kaizen của công ty',
      'Cho rằng đó không phải việc của mình và bỏ qua không quan tâm'
    ],
    correctAnswerIndex: 2,
    explanation: 'Văn hóa Tân Phú Việt Nam luôn khuyến khích CBNV đề xuất cải tiến (Kaizen/Sáng kiến) để cùng nhau xây dựng môi trường làm việc thông minh và hiệu quả hơn.'
  },
  {
    id: 'q12',
    text: 'Việc bàn giao ca giữa hai ca sản xuất cần phải đảm bảo nguyên tắc nào dưới đây?',
    options: [
      'Chỉ cần nhắn tin qua điện thoại hoặc bàn giao miệng nhanh gọn là đủ',
      'Giao nhận trực tiếp tại máy, ghi chép đầy đủ nhật ký vận hành về tình trạng máy móc, chất lượng phôi, bán thành phẩm và các lưu ý đặc biệt',
      'Hết giờ là ra về, ca sau tự vào tìm hiểu và tự xử lý tiếp công việc',
      'Chỉ bàn giao ca khi máy móc bị hỏng hóc hoặc thiếu nguyên vật liệu sản xuất'
    ],
    correctAnswerIndex: 1,
    explanation: 'Bàn giao trực tiếp tại hiện trường và ghi chép đầy đủ sổ sách giúp đảm bảo tính thông suốt, an toàn và ổn định về mặt chất lượng sản xuất giữa các ca.'
  },
  {
    id: 'q13',
    text: 'Lãng phí do "Chờ đợi" trong sản xuất tinh gọn (Lean) gây ra tác hại gì?',
    options: [
      'Làm giảm năng suất lao động, kéo dài thời gian hoàn thành đơn hàng và gây ức chế cho người lao động',
      'Giúp người lao động có nhiều thời gian nghỉ ngơi để tái tạo sức lao động',
      'Không ảnh hưởng gì vì công ty vẫn trả lương theo thời gian làm việc',
      'Giúp máy móc được làm mát và bảo dưỡng tự nhiên trong lúc chờ'
    ],
    correctAnswerIndex: 0,
    explanation: 'Lãng phí chờ đợi (chờ nguyên liệu, chờ lệnh sản xuất, chờ sửa máy...) trực tiếp làm sụt giảm năng suất sản xuất và hiệu quả chung của doanh nghiệp.'
  },
  {
    id: 'q14',
    text: 'Một lô hàng phát hiện bị lỗi ngoại quan (màu sắc không đều, bề mặt trầy xước) tại xưởng sản xuất, cách xử lý nào đúng quy chuẩn?',
    options: [
      'Trộn lẫn vào lô hàng đạt chất lượng để xuất đi nhằm tránh bị trừ điểm năng suất',
      'Gắn thẻ nhận diện hàng lỗi (Non-conforming), cách ly lô hàng khẩn cấp và báo bộ phận quản lý chất lượng (QA/QC) xử lý theo quy trình',
      'Đem vứt bỏ ngay vào sọt rác của nhà máy để tránh bị cấp trên nhìn thấy',
      'Cứ để nguyên tại chỗ, ai hỏi thì bảo không phải do ca của mình làm'
    ],
    correctAnswerIndex: 1,
    explanation: 'Việc dán nhãn nhận diện và cách ly hàng không phù hợp là yêu cầu kiểm soát chất lượng bắt buộc để ngăn ngừa lỗi rò rỉ tới khách hàng.'
  },
  {
    id: 'q15',
    text: 'Khi có khách tham quan hoặc đối tác đến xưởng làm việc, thái độ ứng xử chuẩn mực của CBNV Tân Phú Việt Nam là gì?',
    options: [
      'Không quan tâm, bỏ mặc khách thích đi đâu thì đi',
      'Dừng hoàn toàn mọi công việc sản xuất để đứng nhìn và bàn tán xôn xao',
      'Chào hỏi lịch sự lồng ghép tinh thần hiếu khách, tuân thủ nghiêm túc kỷ luật lao động và tập trung vận hành an toàn',
      'Chạy lại chụp ảnh lưu niệm cùng khách khi không có sự đồng ý của quản lý'
    ],
    correctAnswerIndex: 2,
    explanation: 'Chào hỏi lịch sự, văn minh kết hợp với tác phong làm việc an toàn, chuyên nghiệp là hình ảnh đẹp đại diện cho văn hóa con người Tân Phú.'
  },
  {
    id: 'q16',
    text: 'Tại khu vực sản xuất văn phòng hoặc nhà máy, mục tiêu của hoạt động "Sắp xếp" (Seiton) trong 5S là gì?',
    options: [
      'Để mọi thứ bừa bộn khi nào cần dùng thì đi tìm sau',
      'Mọi vật dụng có vị trí quy định rõ ràng, có nhãn tên, dễ thấy, dễ lấy, dễ trả lại',
      'Cất giấu tất cả dụng cụ vào sâu trong tủ khóa lại để không bị mất',
      'Mua sắm thêm thật nhiều tủ kệ đắt tiền để trưng bày cho đẹp mắt'
    ],
    correctAnswerIndex: 1,
    explanation: 'Sắp xếp trong 5S đảm bảo quản lý trực quan khoa học, giúp loại bỏ hoàn toàn lãng phí thời gian tìm kiếm công cụ dụng cụ.'
  },
  {
    id: 'q17',
    text: 'Vào cuối giờ làm việc hoặc cuối ca sản xuất, việc nên làm đối với các nguồn năng lượng (điện, khí nén, nước) là gì?',
    options: [
      'Cứ để nguyên trạng thái hoạt động vì ca sau sẽ có người vào làm tiếp',
      'Kiểm tra và tắt toàn bộ các thiết bị điện, van khí, nước không sử dụng để tiết kiệm tài nguyên và phòng chống nguy cơ hỏa hoạn',
      'Chỉ tắt những thiết bị nào tỏa ra quá nhiều nhiệt lượng gây nóng',
      'Tắt đột ngột hệ thống điện tổng của nhà máy mà không cần thông báo'
    ],
    correctAnswerIndex: 1,
    explanation: 'Tắt thiết bị khi không sử dụng giúp tiết kiệm chi phí năng lượng đồng thời đảm bảo an toàn phòng chống cháy nổ cho nhà máy.'
  },
  {
    id: 'q18',
    text: 'Trong Văn hóa 3T, tinh thần "Tự học tập và phát triển bản thân" đòi hỏi điều gì ở mỗi CBNV?',
    options: [
      'Chờ đợi công ty tổ chức lớp đào tạo bắt buộc mới tham gia học',
      'Chủ động học hỏi từ đồng nghiệp, cập nhật kiến thức chuyên môn, quy trình mới và tích cực nâng cấp tay nghề hàng ngày',
      'Chỉ học hỏi những kiến thức ngoài ngành để chuẩn bị cơ hội đổi việc',
      'Cho rằng năng lực hiện tại của bản thân đã quá giỏi nên không cần học thêm gì'
    ],
    correctAnswerIndex: 1,
    explanation: 'Tự học tập liên tục giúp cải thiện năng lực cá nhân, thích ứng nhanh với công nghệ mới và đóng góp thiết thực cho sự phát triển của công ty.'
  },
  {
    id: 'q19',
    text: 'Khi phát sinh mâu thuẫn hoặc bất đồng ý kiến về phương án triển khai công việc với đồng nghiệp, bạn nên giải quyết thế nào?',
    options: [
      'Trao đổi thẳng thắn, lắng nghe tích cực trên tinh thần tôn trọng, đóng góp xây dựng và tập trung giải quyết vấn đề thay vì công kích cá nhân',
      'To tiếng tranh cãi để chứng minh bản thân luôn đúng và áp đặt ý chí lên người khác',
      'Giữ thái độ im lặng bất hợp tác, tự ý làm theo cách riêng của mình',
      'Bỏ bê công việc chung và đi nói xấu sau lưng đồng nghiệp đó'
    ],
    correctAnswerIndex: 0,
    explanation: 'Giao tiếp cởi mở, tôn trọng là nền tảng giải quyết mọi bất đồng hiệu quả, hướng đến lợi ích chung tốt nhất của công ty.'
  },
  {
    id: 'q20',
    text: 'Hành vi nào dưới đây vi phạm nghiêm trọng tính "Tự giác" trong Văn hóa 3T về cam kết chất lượng?',
    options: [
      'Tự kiểm tra kỹ chất lượng phôi và bán thành phẩm trước khi đưa vào ca sản xuất của mình',
      'Phát hiện lỗi kỹ thuật nhỏ nhưng cố tình nhắm mắt bỏ qua để kịp hoàn thành định mức chỉ tiêu sản lượng được giao',
      'Ghi chép trung thực, khách quan toàn bộ các thông số kỹ thuật định kỳ vào phiếu kiểm soát',
      'Chủ động đề xuất phương án cải tiến để loại trừ lỗi phát sinh lặp lại ở công đoạn sau'
    ],
    correctAnswerIndex: 1,
    explanation: 'Gian dối hoặc che giấu lỗi chất lượng vì lợi ích sản lượng tạm thời phá hoại lòng tin của khách hàng và uy tín của thương hiệu.'
  },
  {
    id: 'q21',
    text: 'Trong hoạt động sản xuất, việc đổ và xử lý rác thải công nghiệp/nguy hại cần tuân thủ nguyên tắc gì?',
    options: [
      'Đổ chung tất cả các loại rác thải vào một sọt gỗ cho gọn gàng',
      'Phân loại đúng danh mục rác thải nguy hại, rác tái chế, rác hữu cơ tại nguồn và bỏ vào đúng nơi quy định',
      'Chờ khi nào nhà máy đầy rác thì gom lại mang ra bãi cỏ đốt tiêu hủy',
      'Tiện đâu vứt đấy để tối ưu tốc độ dọn dẹp hiện trường làm việc nhanh nhất'
    ],
    correctAnswerIndex: 1,
    explanation: 'Phân loại rác tại nguồn là trách nhiệm bảo vệ môi trường, tuân thủ pháp luật và nâng cao hình ảnh sạch đẹp của doanh nghiệp.'
  },
  {
    id: 'q22',
    text: 'Ý nghĩa to lớn nhất của việc duy trì triệt để phong trào 5S hàng ngày tại khu vực làm việc là gì?',
    options: [
      'Chỉ để chuẩn bị đối phó cho các đợt thanh tra đột xuất của cấp trên',
      'Tạo dựng môi trường làm việc sạch sẽ, ngăn nắp, an toàn, nâng cao năng suất và hiệu suất lao động tổng thể',
      'Làm cho người lao động mệt mỏi thêm sau những giờ lao động vất vả',
      'Để khuất mắt các loại bụi bẩn dưới gầm bàn hoặc gầm máy không ai nhìn thấy'
    ],
    correctAnswerIndex: 1,
    explanation: '5S hàng ngày tạo nên môi trường làm việc chuyên nghiệp, phát hiện lỗi nhanh gọn, ngăn ngừa tai nạn lao động đáng tiếc.'
  },
  {
    id: 'q23',
    text: 'Khi phát hiện một sự cố khẩn cấp (chập điện, rò rỉ hóa chất lớn, đám cháy khởi phát), hành động ưu tiên số 1 của bạn là gì?',
    options: [
      'Bỏ chạy một mình thật nhanh ra ngoài mà không báo cho ai biết phòng vệ',
      'Kêu to báo động khẩn cấp, ngắt ngay nguồn điện khu vực (nếu an toàn), sử dụng phương tiện chữa cháy tại chỗ và báo ngay đội PCCC nội bộ',
      'Đứng lại chụp ảnh, quay video đăng lên mạng xã hội để cảnh báo mọi người',
      'Tự mình đi tìm kiếm người quản lý ở xa để xin chỉ thị hành động tiếp theo'
    ],
    correctAnswerIndex: 1,
    explanation: 'Ưu tiên hàng đầu trong sự cố khẩn cấp là kích hoạt báo động, cô lập nguồn nguy hiểm bảo vệ tính mạng tập thể và ứng phó tức thì tại chỗ.'
  },
  {
    id: 'q24',
    text: 'Khi nhận được phản ánh của khách hàng về sản phẩm bị lỗi, tinh thần ứng xử "3T" chuyên nghiệp nhất là gì?',
    options: [
      'Đổ lỗi ngay cho bộ phận giao nhận vận chuyển hoặc lỗi từ phía sử dụng của khách hàng',
      'Nghiêm túc lắng nghe, tiếp nhận thông tin chân thành, thực hiện truy xuất tìm nguyên nhân gốc rễ và đưa ra giải pháp khắc phục triệt để sớm nhất',
      'Từ chối trả lời, trì hoãn xử lý khi nào rảnh rỗi mới liên hệ lại',
      'Khuyên khách hàng nên tự sửa chữa hoặc tự thông cảm vì sản xuất công nghiệp luôn có tỷ lệ lỗi'
    ],
    correctAnswerIndex: 1,
    explanation: 'Chân thành nhận trách nhiệm, chủ động tìm nguyên nhân gốc rễ và hành động nhanh chóng cứu vãn lòng tin của khách hàng là phong cách ứng xử 3T đích thực.'
  },
  {
    id: 'q25',
    text: 'Tại sao việc quản lý và bảo quản tốt công cụ dụng cụ (CCDC) cầm tay lại là biểu hiện của tinh thần "Tự quản"?',
    options: [
      'Vì CCDC là tài sản thuộc sở hữu cá nhân của người lao động mua sắm',
      'Vì bảo quản tốt giúp kéo dài tuổi thọ thiết bị, sẵn sàng sử dụng khi cần, giảm chi phí mua sắm lãng phí và đảm bảo an toàn tuyệt đối',
      'Vì nếu làm mất công ty cũng sẽ không cấp phát bổ sung cái mới',
      'Giúp người lao động thể hiện mình là người ưa sạch sẽ bóng bẩy'
    ],
    correctAnswerIndex: 1,
    explanation: 'CCDC được giữ gìn chu đáo nâng cao độ bền, rút ngắn thao tác chuẩn bị và thể hiện ý thức làm chủ sâu sắc đối với tài sản chung.'
  }
];
