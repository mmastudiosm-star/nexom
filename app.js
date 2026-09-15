import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://mjmzpbhflctxrkrkzebw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qbXpwYmhmbGN0eHJrcmt6ZWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NzA3ODAsImV4cCI6MjEwNDU0Njc4MH0.AtV8I1RsdPG_I7hIMNlM489wjse6k4Jz0pEfRbQpYY4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===================================================
// بخش اول: صفحه ورود با نام (index.html)
// ===================================================
const usernameInput = document.getElementById('username-input');
const messageArea = document.getElementById('message-area');

if (usernameInput) {
    // اگر قبلاً نامی ذخیره شده، مستقیم برو به چت
    const savedName = localStorage.getItem('username');
    if (savedName) {
        window.location.href = 'chat.html';
    }

    document.getElementById('enter-chat-btn').addEventListener('click', () => {
        const name = usernameInput.value.trim();

        if (!name) {
            messageArea.textContent = 'لطفاً یک نام وارد کنید.';
            messageArea.style.color = '#d9534f';
            return;
        }

        if (name.length < 2) {
            messageArea.textContent = 'نام باید حداقل ۲ حرف باشد.';
            messageArea.style.color = '#d9534f';
            return;
        }

        // ذخیره نام در مرورگر
        localStorage.setItem('username', name);
        window.location.href = 'chat.html';
    });

    // اجازه ورود با Enter
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('enter-chat-btn').click();
        }
    });
}

// ===================================================
// بخش دوم: صفحه چت (chat.html)
// ===================================================
const messagesList = document.getElementById('messages-list');

if (messagesList) {
    const username = localStorage.getItem('username');

    if (!username) {
        window.location.href = 'index.html';
    } else {
        document.getElementById('current-user-name').textContent = username;

        // تابع جلوگیری از XSS
        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };

        // تابع نمایش پیام روی صفحه
        const addMessage = (msg) => {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'message-item';
            const isMine = msg.user_name === username;
            if (isMine) msgDiv.classList.add('my-message');
            msgDiv.innerHTML = `
                <div class="msg-header">${escapeHtml(msg.user_name || 'ناشناس')}</div>
                <div class="msg-content">${escapeHtml(msg.content)}</div>
            `;
            messagesList.appendChild(msgDiv);
            messagesList.scrollTop = messagesList.scrollHeight;
        };

        // بارگذاری پیام‌های قبلی
        const loadMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) {
                console.error('خطا در بارگذاری پیام‌ها:', error);
                alert('خطا در بارگذاری پیام‌ها: ' + error.message);
                return;
            }
            messagesList.innerHTML = '';
            data.forEach(addMessage);
        };

        await loadMessages();

        // گوش دادن به پیام‌های جدید
        supabase
            .channel('public:messages')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                (payload) => addMessage(payload.new)
            )
            .subscribe();

        // ارسال پیام
        const sendMessage = async () => {
            const input = document.getElementById('message-input');
            const content = input.value.trim();
            if (!content) return;

            const { error } = await supabase.from('messages').insert({
                content: content,
                user_name: username,
            });

            if (error) {
                console.error('خطا در ارسال:', error);
                alert('خطا در ارسال پیام: ' + error.message);
            } else {
                input.value = '';
            }
        };

        document.getElementById('send-message-btn').addEventListener('click', sendMessage);
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        // خروج
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('username');
            window.location.href = 'index.html';
        });
    }
}