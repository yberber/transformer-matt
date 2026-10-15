// Turkish, drafted from en.ts. Needs native-speaker review before release.
import type { MessageKey } from "./en";

export const tr: Record<MessageKey, string> = {
  "site.title": "Inside the Transformer",
  "site.kicker": "GPT-2 small · 124M parametre",
  "site.tagline":
    "Gerçek bir dil modelinin, GPT-2 small'un, bir metni nasıl sürdürdüğünü her adımın ardındaki gerçek sayılarla izleyin.",
  "note.completion":
    "GPT-2 bir sohbet asistanı değil, bir metin tamamlama modelidir: soruları yanıtlamaz, kendisine verilen metni sürdürür.",
  "note.english":
    "Örnekler İngilizcedir, çünkü GPT-2 neredeyse yalnızca İngilizce web metinleriyle eğitildi; başka dillerde sürdürdüğü metinler çok daha zayıftır.",

  "lang.label": "Dil",
  "example.label": "Örnek",
  "example.band.short": "Kısa",
  "example.band.medium": "Orta",
  "example.band.long": "Uzun",
  "step.controls": "Adımlar",
  "step.label": "Adım",
  "step.previous": "Önceki adım",
  "step.next": "Sonraki token",
  "step.of": "Adım {step} / {steps}",
  "step.end": "Bu Örneğin önceden hesaplanmış {steps} adımının hepsi gösteriliyor; eklenecek başka token yok.",
  "theme.dark": "Koyu tema",
  "share.copy": "Bağlantıyı kopyala",
  "share.copied": "Bağlantı kopyalandı",
  "share.fallbackLabel": "Bu görünümün bağlantısı",
  "share.fallbackHint": "Kopyalamak için Ctrl+C (Mac'te ⌘C) tuşlarına basın.",

  "pipeline.label": "İşlem hattı",
  "pipeline.inlet": "giriş",
  "pipeline.return": "seçilen token başa geri beslenir",
  "stage.tokenize": "Tokenleştir",
  "stage.embed": "Embedding",
  "stage.blocks": "Bloklar",
  "stage.predict": "Tahmin",
  "stage.spec.tokens.one": "{n} token",
  "stage.spec.tokens.other": "{n} token",
  "stage.spec.layers": "{n} layer",
  "stage.spec.predict": "{n} token içinden ilk 10",

  "term.token": "modelin okuduğu metin birimi: bir kelime, kelimenin bir parçası ya da bir sembol",
  "term.embedding": "bir token'ı temsil eden sayı listesi",
  "term.attention": "her token'ın önceki token'lardan bilgi topladığı adım",
  "term.layer": "sayıların içinden geçtiği 12 özdeş aşamadan biri",

  "view.number": "No. {n}",
  "view.showDetails": "Ayrıntıları göster",
  "view.loading": "Örnek yükleniyor…",
  "view.loadError": "Örnek yüklenemedi.",
  "view.pending":
    "Bu görünüm henüz hazırlanıyor. Şimdilik ayrıntılarda modelin yapılandırmasındaki sayılar yer alıyor.",
  "view.configSource": "{model} modelinin {revision} sürümündeki yapılandırmasından.",
  "view.tokenize.lead":
    "Model harfleri ya da kelimeleri hiç görmez: Prompt'u [[token|token]]'lara böler ve her token bir sayıdır.",
  "view.embed.lead":
    "Her token bir tabloda aranır ve {width} sayılık bir listeye, yani [[embedding|embedding]]'ine dönüşür; üzerine konumu için ikinci bir embedding eklenir.",
  "view.blocks.lead":
    "Sayılar {layers} özdeş [[layer|layer]]'dan geçer: her birinde [[attention|attention]] her token'ın önceki token'lardan bilgi toplamasını sağlar, ardından küçük bir ağ her token'ı ayrı ayrı yeniden işler.",
  "view.predict.lead":
    "Son konumda model, bildiği {vocabulary} token'ın her birine bir olasılık verir; açgözlü (greedy) kod çözme her zaman en olası olanı ekler.",

  "tokens.listLabel": "Token'lar",
  "tokens.prompt": "Prompt",
  "tokens.continuation": "Devam metni",
  "tokens.hint": "Modelin o konumda neyi tahmin ettiğini görmek için bir token'ın üzerine gelin ya da ona odaklanıp ok tuşlarını kullanın.",
  "prediction.at": "{n}. konumdaki tahmin",
  "prediction.actual": "Gerçekte gelen:",
  "prediction.actualRank": "{rank}. sırada, {probability}",
  "prediction.notInTop": "ilk 10'da değil",

  "predict.sequenceLabel": "Şimdiye kadarki dizi",
  "predict.next": "sonraki",
  "predict.rankedLabel": "En olası 10 sonraki token",
  "predict.rest": "diğer {n} token",
  "predict.scale": "Çubuklar en olası token'a göre ölçeklenmiştir.",
  "predict.greedy":
    "Kod çözme açgözlüdür (greedy): her zaman en olası token eklenir, bu yüzden aynı Prompt her zaman aynı devam metnini verir.",
  "predict.detailsNote": "Olasılıklar {vocabulary} token'ın tümü üzerindendir; ilk 10'un toplamı {sum}.",
  "embed.listLabel": "Konum başına embedding'ler",
  "embed.added":
    "Token embedding'i ile konum embedding'i sayı sayı toplanır; ilk bloğa giren, bu toplamdır.",
  "embed.legend":
    "Her şerit bir vektördür: {width} sayı soldan sağa dizilir. Pozitif sayılar token'ın renginde, negatif sayılar griyle çizilir; sayı 0'dan ne kadar uzaksa renk o kadar güçlüdür.",
  "embed.scaleLow": "{value} veya daha az",
  "embed.scaleHigh": "{value} veya daha fazla",
  "embed.token": "Token embedding'i",
  "embed.position": "Konum embedding'i",
  "embed.sum": "Toplam, 1. bloğa girer",
  "embed.tokenStrip": "{n}. konumdaki token embedding'i",
  "embed.positionStrip": "{n}. konumdaki konum embedding'i",
  "embed.sumStrip": "{n}. konumdaki toplam; ilk bloğa bu girer",
  "embed.truncated":
    "Kısaltılmış görünüm: her vektörün {width} boyutundan ilk {shown} tanesi. Norm, yani vektörün uzunluğu, {width} boyutun tümü üzerindendir.",
  "embed.sumNote":
    "Toplamın ilk {shown} boyutu burada, modelin topladığı gibi kesin olarak toplanır. Normu gösterilmez: bunun için {width} boyutun tümü kesin olarak gerekir, Trace ise yalnızca ilk {shown} boyutu taşır.",
  "embed.tables":
    "Token embedding tablosunda her token için bir satır olmak üzere {width} sayılık {vocabulary} satır vardır; konum embedding tablosunda ise modelin okuyabildiği her konum için bir satır olmak üzere {positions} satır vardır.",
  "table.vector": "Vektör",
  "table.firstDimensions": "İlk {n} boyut",
  "table.norm": "Norm",
  "table.rank": "Sıra",
  "table.prediction": "En olası tahmin",
  "table.probability": "Olasılık",
  "table.position": "Konum",
  "table.token": "Token",
  "table.tokenId": "Token ID",
  "table.bytes": "Baytlar",
  "token.space": "boşluk",
  "token.newline": "yeni satır",
  "token.tab": "sekme",
  "token.partialBytes":
    "{bytes} baytları bir karakterin parçasıdır: tek bir karakter 4 bayta kadar yer kaplayabilir ve burada komşu token'lara bölünmüştür.",

  "config.vocab_size": "Sözcük dağarcığı: modelin bildiği token'lar",
  "config.n_positions": "Modelin okuyabileceği en uzun metin (token)",
  "config.n_embd": "Token başına sayı (embedding genişliği)",
  "config.n_layer": "Layer sayısı",
  "config.n_head": "Layer başına attention head",
  "config.head_dim": "Attention head başına sayı",
};
