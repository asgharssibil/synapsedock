# راهنمای انتشار در GitHub

## نکته مهم درباره فایل نصب

حجم فایل Setup بیشتر از محدودیت ۱۰۰ مگابایتی فایل‌های عادی GitHub است. آن را با `git add` وارد مخزن نکنید. فایل نصب باید در بخش **Releases** بارگذاری شود. `.gitignore` از ورود تصادفی آن جلوگیری می‌کند.

## ساخت مخزن برای اولین بار

از ریشه پروژه اجرا کنید:

```powershell
git add .
git commit -m "Release v0.1.0"
git branch -M main
git remote add origin https://github.com/asgharssibil/synapsedock.git
git push -u origin main
```

مخزن نهایی روی حساب `asgharssibil` با نام `synapsedock` منتشر می‌شود.

## انتشار خودکار نسخه ویندوز

پس از موفق‌شدن CI، تگ نسخه را ارسال کنید:

```powershell
git tag -a v0.1.0 -m "SynapseDock v0.1.0"
git push origin v0.1.0
```

گردش‌کار `Windows release` در GitHub Actions این مراحل را انجام می‌دهد:

1. نصب وابستگی‌ها با `npm ci`
2. اجرای تست‌ها و E2E واقعی Electron
3. ساخت Setup ویندوز x64
4. تولید `SHA256SUMS.txt`
5. ساخت GitHub Release و پیوست‌کردن Setup و checksum

همین گردش‌کار را می‌توان از تب **Actions** و گزینه **Run workflow** نیز با تگ `v0.1.0` اجرا کرد.

## مجوز نرم‌افزار

این مخزن عمومی اما اختصاصی است. فایل `LICENSE` تمام حقوق را محفوظ نگه می‌دارد و بدون اجازه کتبی، حق کپی، تغییر، بازتوزیع یا فروش نمی‌دهد.
