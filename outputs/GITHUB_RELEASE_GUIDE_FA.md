# بسته آماده انتشار در GitHub

پروژه برای انتشار در GitHub آماده شده است. فایل نصب ۱۳۷ مگابایتی به‌دلیل محدودیت ۱۰۰ مگابایتی GitHub نباید داخل commit قرار گیرد؛ `.gitignore` از این اشتباه جلوگیری می‌کند. گردش‌کار GitHub Actions آن را پس از تست به‌عنوان Release Asset منتشر می‌کند.

## انتشار مخزن

```powershell
git add .
git commit -m "Release v0.1.0"
git branch -M main
git remote add origin https://github.com/asgharssibil/synapsedock.git
git push -u origin main
```

مخزن نهایی روی حساب `asgharssibil` با نام `synapsedock` منتشر می‌شود.

## ساخت Release ویندوز

```powershell
git tag -a v0.1.0 -m "SynapseDock v0.1.0"
git push origin v0.1.0
```

گردش‌کار `Windows release` تست‌های خودکار، E2E واقعی Electron، dependency audit، ساخت Setup، تولید SHA-256 و ایجاد GitHub Release را انجام می‌دهد.

## مجوز

مخزن عمومی اما اختصاصی است. فایل `LICENSE` تمام حقوق را محفوظ نگه می‌دارد و بدون اجازه کتبی، حق کپی، تغییر، بازتوزیع یا فروش نمی‌دهد.
