# Proje Özeti: Codeyzer Portföy

Bu belge, "Codeyzer Portföy" uygulamasının mimarisini, teknolojilerini ve genel yapısını özetlemektedir.

## 1. Genel Bakış

Uygulama; gram altın, gram gümüş, döviz, fonlar, emtialar ve hisse senetleri gibi çeşitli varlıkların takibini sağlayan bir portföy yönetim aracıdır. Anlık fiyatları çekerek toplam portföy değerini ve varlık kırılımlarını gösterir.

- **Platformlar:** Web (Vite) ve Mobil (Capacitor)

## 2. Teknoloji Yığını

- **Frontend:** React 18, TypeScript
- **UI Kütüphanesi:** Material-UI (MUI v5)
- **State Yönetimi:** Redux Toolkit, Redux Persist, Listener Middleware
- **Veri Çekme:** Axios
- **Grafikler:** Recharts
- **Routing:** React Router DOM
- **Test:** Vitest, React Testing Library, MSW (Mock Service Worker)

## 3. Temel Özellikler

- Varlık ekleme, silme ve güncelleme.
- Anlık fiyatları otomatik ve manuel olarak çekme.
- Portföyün toplam değerini ve yüzde dağılımını gösterme.
- Kategori bazlı grafikler oluşturma ve yönetme.
- Verilerin `LocalStorage` üzerinde kalıcı olarak saklanması.
- Mobil için biyometrik kimlik doğrulama.

## 4. Proje Yapısı

Proje, `src` klasörü altında modüler bir yapıda organize edilmiştir:

- `api/`: Dış API (fiyat servisleri) ile iletişimi yönetir.
- `components/`: Tekrar kullanılabilir UI bileşenlerini içerir.
- `store/`: Redux state mantığını (`portfolioSlice`, `categorySlice`) barındırır.
- `pages/`: Ana sayfa görünümlerini (Dashboard, Ayarlar vb.) içerir.
- `models/`: TypeScript tip tanımlamalarını (`Holding`, `Category`) saklar.
- `hooks/`: Özel React hook'larını barındırır.

## 5. Veri Yönetimi ve API

- **State:** Uygulama genelindeki state, Redux Toolkit ile yönetilir. `portfolioSlice` varlıkları, `categorySlice` ise kategori grafiklerini yönetir.
- **Kalıcılık:** `redux-persist` kütüphanesi ile portföy ve kategori verileri, tarayıcının `LocalStorage` alanına kaydedilerek veri kaybı önlenir.
- **API Servisleri:** Fiyat verileri **Yahoo Finance** ve **TEFAS RSS** servislerinden `axios` ile çekilir. `msw` ile test ve geliştirme süreçlerinde API'ler mock'lanır.

## 6. Dağıtım

- **Web:** `vite build` komutu ile statik dosyalar oluşturulur.
- **Mobil (Android):** `npx cap sync android` komutu ile proje Android Studio'ya aktarılır ve oradan derlenir.
