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

  "tokenize.listLabel": "Prompt token'ları",
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
