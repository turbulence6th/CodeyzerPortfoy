# Hisse Alım Seviyesi (Aralık) ve Görsel Uyarı – Özellik Analizi

## 1. Amaç

Kullanıcı, sahip olduğu ya da takip ettiği hisse senedi için elle bir **alım seviyesi aralığı** (alt sınır – üst sınır) tanımlayabilsin. Hissenin **anlık fiyatı bu aralığa girdiğinde**, ilgili holding satırı listede görsel olarak farklılaşsın (örn. arka plan renk değişimi, kenar vurgusu, badge/etiket).

Hedefler:
- Manuel veri girişi (otomatik analiz yok – kullanıcı kendi belirler).
- Hızlı göz teması: liste içinde alım seviyesinde olan kalemler kolayca seçilebilsin.
- Az dokunulan, opsiyonel bir alan olsun (girilmediyse hiçbir görsel etki yok).

---

## 2. Mevcut Mimari Durum

İlgili dosyalar:

| Katman | Dosya | Görev |
| --- | --- | --- |
| Tip | `src/models/types.ts` | `Holding` interface — şu an `amount`, `note` vb. tutuyor, alım seviyesi alanı yok. |
| Ekleme | `src/components/AddHoldingDialog.tsx` | Sembol, miktar, not alanları var. |
| Düzenleme | `src/components/EditHoldingDialog.tsx` | Sembol, miktar, not düzenleniyor. |
| Liste satırı | `src/components/HoldingRowItem.tsx` | Görsel render – fiyat, değişim %, kategoriler. Renk vurgusu burada uygulanacak. |
| Liste | `src/components/HoldingsList.tsx` | `HoldingRowItem`'ı `priceData` ile besliyor. |
| Persist | `src/api/holdingsService.ts` + `portfolioSlice` | Holding'leri App Group UserDefaults / Redux'a yazıyor. Yeni alan otomatik taşınır (yapı genişletilebilir JSON). |

Notlar:
- `priceData.price === 0 && previousClose` durumunda `previousClose` kullanılıyor (`HoldingRowItem.tsx:45-48`). Karşılaştırmada da aynı `priceToUse` mantığı kullanılmalı.
- Fiyat negatif/0 olamaz; aralık karşılaştırması basit `>=`/`<=` ile yapılır.
- `holding.type === 'STOCK'` filtresi yalnızca Analiz menü öğesinde zaten var; alım seviyesi de tipik olarak `STOCK` için anlamlı. Ancak teknik olarak `FUND` ve `CURRENCY` için de çalışabilir (kullanıcı izin verirse).

---

## 3. Veri Modeli Değişikliği

`Holding` interface'ine **iki opsiyonel sayısal alan** eklenir. Tek bir hedef fiyat yerine aralık tercih edildi (kullanıcı isteği):

```ts
// src/models/types.ts
export interface Holding {
  // ...mevcut alanlar
  buyTargetMin?: number;   // Alım aralığı alt sınırı (TRY)
  buyTargetMax?: number;   // Alım aralığı üst sınırı (TRY)
}
```

### Neden iki ayrı alan?
- Aralık karşılaştırması basit: `min <= price <= max`.
- Kullanıcı yalnızca tek değer girmek isterse (örn. `min == max`) yine çalışır.
- İleride "alarm tetiklendi mi?" bilgisi eklenmek istenirse genişletilebilir.

### Validasyon kuralları
- `buyTargetMin > 0`, `buyTargetMax > 0`.
- `buyTargetMin <= buyTargetMax`. Aksi halde form hatası.
- İkisi de boş bırakılabilir → o zaman görsel uyarı tamamen kapalı.
- Yalnız biri girilirse → diğerini otomatik aynı değere set et (tek nokta uyarısı) **veya** hata göster. Önerilen: ikisi de zorunlu (girilecekse beraber).

### Persist
Mevcut `saveHoldingsToAppGroup` Holding nesnesini JSON olarak yazıyor; yeni opsiyonel alanlar şeffaf şekilde taşınır. **Native Swift tarafı** (`HoldingForNative`) eğer Codable struct ise alan eklemek gerekebilir – Watch/Widget bu alanı kullanmayacaksa `nil`-tolerant tanımlamak yeterli. (Watch tarafı sadece miktar/fiyat hesaplıyor, alım seviyesi iOS app içinde kalabilir.)

---

## 4. UI: Veri Girişi

### 4.1 AddHoldingDialog
Sembol/Miktar/Not alanlarının altına, **yalnızca `type === 'STOCK'`** seçildiğinde görünen yeni bir bölüm:

```
┌──────────────────────────────────────────────┐
│ Alım Seviyesi (Opsiyonel)                    │
│ ┌──────────────┐  ┌──────────────┐           │
│ │ Alt Sınır ₺  │  │ Üst Sınır ₺  │           │
│ └──────────────┘  └──────────────┘           │
│ Anlık fiyat bu aralığa girdiğinde satır      │
│ vurgulanır.                                  │
└──────────────────────────────────────────────┘
```

- İki `TextField type="number"` yan yana (`Grid size={6}`).
- `inputProps={{ step: 'any', min: 0 }}`.
- `helperText`: "İsteğe bağlı. Boş bırakırsanız uyarı çalışmaz."
- `handleSave` içinde validasyon:
  ```ts
  const min = parseFloat(buyMin);
  const max = parseFloat(buyMax);
  const hasMin = !isNaN(min);
  const hasMax = !isNaN(max);
  if (hasMin !== hasMax) { setError('Alt ve üst sınır birlikte girilmeli'); return; }
  if (hasMin && hasMax && min > max) { setError('Alt sınır üst sınırdan büyük olamaz'); return; }
  ```
- `newHolding` nesnesine `buyTargetMin`/`buyTargetMax` eklenir (boşsa hiç set edilmez).

### 4.2 EditHoldingDialog
Aynı iki alan eklenir. `useEffect` içinde `holding.buyTargetMin`/`buyTargetMax` form state'ine doldurulur. Aynı validasyon mantığı.

### 4.3 Sadece STOCK kısıtlaması
- `type` state'i değişirse (Add dialog'da), STOCK değilse alanları gizle veya disable et.
- Edit dialog'da `holding.type !== 'STOCK'` ise bölüm gösterilmesin.
- Karar gerekirse: Tüm tiplere açmak isteniyorsa kısıtlamayı kaldırmak basit.

---

## 5. UI: Görsel Uyarı (HoldingRowItem)

### 5.1 Karşılaştırma mantığı
`HoldingRowItem.tsx` içine, `priceToUse` hesabının hemen ardından:

```ts
const inBuyZone =
  holding.buyTargetMin != null &&
  holding.buyTargetMax != null &&
  priceToUse != null &&
  priceToUse >= holding.buyTargetMin &&
  priceToUse <= holding.buyTargetMax;
```

`priceToUse` zaten `priceData.price` veya `previousClose`'u fallback olarak içeriyor; karşılaştırma için aynı değeri kullanmak tutarlı.

### 5.2 Görsel seçenekler (önerilen kombinasyon)

| Sinyal | Etki | Gerekçe |
| --- | --- | --- |
| **Sol kenar şeridi** (3-4px) | `borderLeft: '4px solid', borderColor: 'success.main'` (theme uyumlu) | Liste içinde gözü hemen yakalar, içerik genişliğini bozmaz. |
| **Hafif arka plan tonu** | `backgroundColor: alpha(theme.palette.success.main, 0.08)` | Tüm satırı vurgular ama yazıyı bozmaz, dark/light tema uyumlu. |
| **Küçük badge/Chip** | "Alım aralığında" etiketi (success rengi) | Sebep belirsiz kalmasın; tooltip ile aralığı göster: "₺120,00 – ₺135,00". |

Renk olarak `success` (yeşil) önerilir — `error.main` zaten "fiyat hatası", `warning.main` "eski tarih" için kullanılıyor, semantik karışmasın.

### 5.3 Uygulama
`HoldingRowItem.tsx` root `Box`'ının `sx`'i:

```ts
sx={{
  position: 'relative',
  borderBottom: ...,
  borderLeft: inBuyZone ? '4px solid' : '4px solid transparent',
  borderLeftColor: inBuyZone ? 'success.main' : 'transparent',
  backgroundColor: inBuyZone
    ? (theme) => alpha(theme.palette.success.main, 0.08)
    : 'transparent',
  transition: 'background-color 0.2s ease, border-color 0.2s ease',
  '&:hover': { backgroundColor: 'action.hover' },
}}
```

Sembolün yanına (`sourceIcon`, `staleDateIcon` ile aynı satıra) küçük bir Chip eklenir:

```tsx
{inBuyZone && (
  <Tooltip title={`Alım aralığı: ₺${holding.buyTargetMin!.toLocaleString('tr-TR')} – ₺${holding.buyTargetMax!.toLocaleString('tr-TR')}`}>
    <Chip size="small" color="success" label="Alım" sx={{ height: 18, fontSize: '0.65rem' }} />
  </Tooltip>
)}
```

### 5.4 Erişilebilirlik
- Sadece renkle iletilmemeli (color-blind kullanıcı). Chip etiketi + tooltip bu kısıtlamayı karşılıyor.
- Dark mode'da `alpha(success.main, 0.08)` yeterince görünür kalıyor; isterse `0.12`'ye çıkarılabilir.

---

## 6. Yardımcı Fonksiyon (Opsiyonel)

`src/utils/targetPriceHelper.ts` adında küçük bir modül:

```ts
import type { Holding, PriceData } from '../models/types';

export function getEffectivePrice(priceData?: PriceData): number | undefined {
  if (!priceData) return undefined;
  if (priceData.price === 0 && priceData.previousClose) return priceData.previousClose;
  return priceData.price;
}

export function isInBuyZone(holding: Holding, priceData?: PriceData): boolean {
  const p = getEffectivePrice(priceData);
  return (
    holding.buyTargetMin != null &&
    holding.buyTargetMax != null &&
    p != null &&
    p >= holding.buyTargetMin &&
    p <= holding.buyTargetMax
  );
}
```

Avantajı: Aynı mantık ileride **DailyMovers**, bildirimler veya PortfolioSummary için tekrar kullanılabilir.

---

## 7. İleride Eklenebilecekler (Bu Sürümde Hayır)

- **Push bildirimi** fiyat aralığa girdiğinde (one-shot).
- **Widget** üzerinde "alım fırsatı" rozeti.
- **Sıralama/filtre**: "Sadece alım aralığında olanları göster".
- **Hedef satış aralığı** (`sellTargetMin/Max`) — aynı pattern, kırmızı/turuncu vurgu.
- **Geçmiş tetiklemeleri loglama** (kaç gündür aralıkta vs.).

Şimdilik scope dışı — yalnızca aralık girişi + satır vurgusu yapılacak.

---

## 8. Uygulama Adımları (Kısa)

1. `types.ts` → `Holding`'e `buyTargetMin?`, `buyTargetMax?` ekle.
2. `src/utils/targetPriceHelper.ts` oluştur (`isInBuyZone`, `getEffectivePrice`).
3. `AddHoldingDialog.tsx` → STOCK için iki yeni alan, validasyon, `newHolding`'e taşı.
4. `EditHoldingDialog.tsx` → aynı alanlar, `useEffect`'te doldur, `updates`'a yaz.
5. `HoldingRowItem.tsx` → `isInBuyZone` çağrısı, sol kenar + arka plan vurgusu, Chip + tooltip.
6. Manuel test:
   - Alanlar boş → görsel yok.
   - `min > max` → form hatası.
   - Fiyat aralık içinde → yeşil vurgu + Chip + tooltip.
   - Fiyat aralık dışında → eski görünüm.
   - Dark/Light tema, küçük ekran (xs), uzun semboller.
7. (Opsiyonel) Native `HoldingForNative` struct'ına opsiyonel iki alan ekle ki gelecekte Widget'ta kullanılabilsin.

---

## 9. Risk ve Notlar

- **Eski veriler**: Mevcut holding'lerde alanlar `undefined` olacak → `!= null` guard'ı zaten bunu karşılıyor.
- **Görsel gürültü**: Çok sayıda satır aynı anda vurgulanırsa liste rahatsız edici görünebilir → tonu hafif tut (`alpha 0.08`).
- **Fiyat dalgalanması**: Anlık fiyat sınırın hemen üstünde/altında salınabilir. İstenirse küçük bir buffer eklenebilir, ama kullanıcı manuel aralık veriyor — bu kendi kontrolünde, buffer şart değil.
- **TRY/Döviz/Fon**: İlk sürümde sadece STOCK için açılması, kullanıcının `note` alanını alım hedefi yazmak için kullanmasından doğan dağınıklığı önler. Kısıtlama tek satır değişiklikle gevşetilebilir.
