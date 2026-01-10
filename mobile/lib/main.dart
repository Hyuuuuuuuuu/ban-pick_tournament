import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

// 🔥 QUAN TRỌNG: Hãy kiểm tra lại IP máy tính của bạn (ipconfig)
// Nếu IP thay đổi, hãy sửa dòng dưới đây:
const String SERVER_IP = "192.168.1.29";
const String SERVER_PORT = "3001";
const String API_URL = "http://$SERVER_IP:$SERVER_PORT";

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Maimai Picker',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF121212),
        appBarTheme: const AppBarTheme(
            backgroundColor: Colors.transparent, elevation: 0, centerTitle: true,
            titleTextStyle: TextStyle(color: Color(0xFF00E5FF), fontWeight: FontWeight.bold, fontSize: 20)
        ),
      ),
      home: const LoginScreen(),
    );
  }
}

// ================= 1. MÀN HÌNH ĐĂNG NHẬP =================
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _pin = TextEditingController();
  bool _loading = false;

  Future<void> _login() async {
    setState(() => _loading = true);
    try {
      final res = await http.post(Uri.parse('$API_URL/api/mobile-login'),
          headers: {'Content-Type': 'application/json'}, body: json.encode({'pin': _pin.text}));
      if (res.statusCode == 200 && mounted) {
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const RoleSelectionScreen()));
      } else {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Sai mã PIN!"), backgroundColor: Colors.red));
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Lỗi kết nối Server!"), backgroundColor: Colors.red));
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SizedBox(
          width: 300,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.security, size: 80, color: Color(0xFF00E5FF)),
              const SizedBox(height: 20),
              TextField(
                  controller: _pin, obscureText: true, textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 24, letterSpacing: 5),
                  decoration: const InputDecoration(filled: true, fillColor: Color(0xFF222222), hintText: "PIN (123456)")),
              const SizedBox(height: 20),
              SizedBox(width: double.infinity, height: 50, child: ElevatedButton(onPressed: _loading ? null : _login, child: const Text("LOGIN")))
            ],
          ),
        ),
      ),
    );
  }
}

// ================= 2. MÀN HÌNH CHỌN THIẾT BỊ =================
class RoleSelectionScreen extends StatelessWidget {
  const RoleSelectionScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("CHỌN THIẾT BỊ")),
      body: Center(
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _btn(context, "PLAYER 1", Colors.redAccent, "p1"),
            const SizedBox(width: 20),
            _btn(context, "PLAYER 2", Colors.blueAccent, "p2"),
          ],
        ),
      ),
    );
  }
  Widget _btn(BuildContext context, String txt, Color col, String key) {
    return SizedBox(
      width: 150, height: 150,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(backgroundColor: col, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15))),
        onPressed: () => Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => PlayerGameScreen(roleKey: key, roleName: txt, themeColor: col))),
        child: Text(txt, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
      ),
    );
  }
}

// ================= 3. MÀN HÌNH GAME (ĐÃ SỬA LỖI LAYOUT) =================
class PlayerGameScreen extends StatefulWidget {
  final String roleKey, roleName;
  final Color themeColor;
  const PlayerGameScreen({super.key, required this.roleKey, required this.roleName, required this.themeColor});
  @override
  State<PlayerGameScreen> createState() => _PlayerGameScreenState();
}

class _PlayerGameScreenState extends State<PlayerGameScreen> {
  Map<String, dynamic>? gameState;
  Timer? _timer;
  bool isActionLoading = false;

  @override
  void initState() {
    super.initState();
    _fetch();
    _timer = Timer.periodic(const Duration(milliseconds: 500), (_) => _fetch());
  }
  @override
  void dispose() { _timer?.cancel(); super.dispose(); }

  Future<void> _fetch() async {
    try {
      final res = await http.get(Uri.parse('$API_URL/api/game-state'));
      if (res.statusCode == 200 && mounted) setState(() => gameState = json.decode(res.body));
    } catch (_) {}
  }

  Future<void> _send(String action, String id) async {
    if (isActionLoading) return;
    setState(() => isActionLoading = true);
    try {
      final res = await http.post(Uri.parse('$API_URL/api/mobile-action'),
          headers: {'Content-Type': 'application/json'},
          body: json.encode({'player': widget.roleKey, 'action': action, 'songId': id}));
      final data = json.decode(res.body);
      if (data['success'] == false && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(data['message']), backgroundColor: Colors.red, duration: const Duration(seconds: 1)));
      } else { _fetch(); }
    } catch (_) {} finally { setState(() => isActionLoading = false); }
  }

  @override
  Widget build(BuildContext context) {
    if (gameState == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    List pool = gameState!['pool'] ?? [];
    List globalBanned = gameState!['banned_ids'] ?? [];
    List p1Banned = gameState!['p1_banned'] ?? [];
    List p2Banned = gameState!['p2_banned'] ?? [];

    String phase = gameState!['phase'] ?? 'SETUP';
    Map players = gameState!['players'] ?? {'p1': 'P1', 'p2': 'P2'};
    String myName = widget.roleKey == 'p1' ? players['p1'] : players['p2'];

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              color: Colors.black,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(widget.roleName, style: TextStyle(color: widget.themeColor, fontWeight: FontWeight.bold)),
                    Text(myName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  ]),
                  Text(phase, style: const TextStyle(color: Colors.amber, fontWeight: FontWeight.bold, fontSize: 16)),
                ],
              ),
            ),

            // Grid View Bài hát
            Expanded(
              child: pool.isEmpty
                  ? const Center(child: Text("Waiting for Pool..."))
                  : GridView.builder(
                padding: const EdgeInsets.all(5),
                // ✅ [FIX 1] Bỏ dòng physics cũ đi để cho phép cuộn màn hình trên điện thoại
                // physics: const NeverScrollableScrollPhysics(),

                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 5,
                    childAspectRatio: 0.85, // ✅ [FIX 2] Tỉ lệ 0.85 giúp ô cao hơn, chứa đủ ảnh vuông + text
                    crossAxisSpacing: 5, mainAxisSpacing: 5
                ),
                itemCount: pool.length,
                itemBuilder: (ctx, i) {
                  final song = pool[i];
                  String id = song['id'];

                  bool isGlobalBan = globalBanned.contains(id);
                  bool isMySecretBan = (widget.roleKey == 'p1' && p1Banned.contains(id)) ||
                      (widget.roleKey == 'p2' && p2Banned.contains(id));
                  bool isPick = (widget.roleKey=='p1' && gameState!['p1_pick']?['id']==id) ||
                      (widget.roleKey=='p2' && gameState!['p2_pick']?['id']==id);

                  // ✅ [FIX 3] Dùng đúng key 'image_hash'
                  String imageUrl = "$API_URL/assets/jackets/${song['image_hash']}";

                  return GestureDetector(
                    onTap: () {
                      if (phase == 'REVEAL_PHASE') return;
                      if (phase == 'BAN_PHASE' && !isGlobalBan && !isMySecretBan) _send('BAN', id);
                      if (phase == 'PICK_PHASE' && !isGlobalBan) _send('PICK', id);
                    },
                    child: Container(
                      decoration: BoxDecoration(
                          color: const Color(0xFF222222), borderRadius: BorderRadius.circular(5),
                          border: Border.all(color: isPick ? widget.themeColor : (isMySecretBan ? Colors.redAccent : Colors.transparent), width: 3)
                      ),
                      child: Column(
                        children: [
                          // ✅ [FIX 4] Dùng AspectRatio để ép ảnh luôn là hình vuông
                          AspectRatio(
                            aspectRatio: 1 / 1,
                            child: Stack(
                              fit: StackFit.expand,
                              children: [
                                ClipRRect(
                                  borderRadius: const BorderRadius.vertical(top: Radius.circular(5)),
                                  child: Image.network(
                                    imageUrl,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_,__,___)=> const Center(child: Icon(Icons.broken_image, color: Colors.grey)),
                                  ),
                                ),
                                if (isGlobalBan || isMySecretBan)
                                  Container(color: Colors.black.withValues(alpha: 0.7), child: const Center(child: Icon(Icons.block, color: Colors.red, size: 30))),
                                if (isPick)
                                  Container(color: widget.themeColor.withValues(alpha: 0.4), child: const Center(child: Icon(Icons.check, color: Colors.white, size: 30))),
                              ],
                            ),
                          ),

                          // ✅ [FIX 5] Phần tên bài tự động co nhỏ (FittedBox)
                          Expanded(
                            child: Container(
                              alignment: Alignment.center,
                              padding: const EdgeInsets.symmetric(horizontal: 2),
                              child: FittedBox(
                                fit: BoxFit.scaleDown, // Tự động thu nhỏ chữ nếu dài quá
                                child: Text(
                                    song['title'],
                                    maxLines: 1,
                                    style: const TextStyle(fontSize: 10, color: Colors.white) // Tăng font lên xíu cho dễ đọc
                                ),
                              ),
                            ),
                          )
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}