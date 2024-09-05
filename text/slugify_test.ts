// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import { assertEquals, assertMatch } from "@std/assert";
import { ASCII_DIACRITICS, DIACRITICS, NON_ASCII, slugify } from "./slugify.ts";
import { charMap } from "./slugify_char_map.ts";

Deno.test("slugify() returns kebabcase", () => {
  assertEquals(slugify("hello world"), "hello-world");
});
Deno.test("slugify() returns lowercase", () => {
  assertEquals(slugify("Hello World"), "hello-world");
});

Deno.test("slugify() handles whitespaces", () => {
  assertEquals(slugify("  Hello   World  "), "hello-world");
  assertEquals(slugify("Hello\tWorld"), "hello-world");
  assertEquals(slugify("Hello\nWorld"), "hello-world");
  assertEquals(slugify("Hello\r\nWorld"), "hello-world");
});

Deno.test("slugify() normalizes diacritic characters to NFC form by default", () => {
  assertEquals(slugify("déjà vu".normalize("NFD")), "déjà-vu".normalize("NFC"));
  assertEquals(slugify("Cliché".normalize("NFD")), "cliché".normalize("NFC"));
  assertEquals(slugify("façade".normalize("NFD")), "façade".normalize("NFC"));
  assertEquals(slugify("résumé".normalize("NFD")), "résumé".normalize("NFC"));
});

Deno.test("slugify() strips diacritics if using charMap", () => {
  assertEquals(slugify("déjà vu", { charMap: new Map() }), "deja-vu");
  assertEquals(slugify("Cliché", { charMap: new Map() }), "cliche");
  assertEquals(slugify("façade", { charMap: new Map() }), "facade");
  assertEquals(slugify("résumé", { charMap: new Map() }), "resume");
});

Deno.test("slugify() strips diacritics if strip: NON_ASCII", () => {
  assertEquals(slugify("déjà vu", { strip: NON_ASCII }), "deja-vu");
  assertEquals(slugify("Cliché", { strip: NON_ASCII }), "cliche");
  assertEquals(slugify("façade", { strip: NON_ASCII }), "facade");
  assertEquals(slugify("résumé", { strip: NON_ASCII }), "resume");
});

Deno.test("slugify() strips all diacritics if strip: DIACRITICS", () => {
  assertEquals(slugify("déjà vu", { strip: DIACRITICS }), "deja-vu");
  assertEquals(slugify("Cliché", { strip: DIACRITICS }), "cliche");
  assertEquals(slugify("façade", { strip: DIACRITICS }), "facade");
  assertEquals(slugify("résumé", { strip: DIACRITICS }), "resume");
  assertEquals(
    slugify("Συστημάτων Γραφής", { strip: DIACRITICS }),
    "συστηματων-γραφης",
  );
});

Deno.test("slugify() strips ASCII diacritics (but not other diacritics) if strip: ASCII_DIACRITICS", () => {
  assertEquals(slugify("déjà-vu", { strip: ASCII_DIACRITICS }), "deja-vu");
  assertEquals(
    slugify("Συστημάτων Γραφής", { strip: ASCII_DIACRITICS }),
    "συστημάτων-γραφής",
  );
});

Deno.test("slugify() handles dashes", () => {
  assertEquals(slugify("-Hello-World-"), "hello-world");
  assertEquals(slugify("--Hello--World--"), "hello-world");
});

Deno.test("slugify() converts empty string to a single dash", () => {
  // Prevent any issues with zero-length slugs in URLs, e.g.
  // `/a//b` -> `/a/b`; `/a/` -> `/a`
  assertEquals(slugify(""), "-");
});

Deno.test("slugify() replaces non-word characters with dashes", () => {
  assertEquals(slugify("Hello, world!"), "hello-world");
  assertEquals(slugify("hello ~ world"), "hello-world");

  assertEquals(
    slugify("Elon Musk considers move to Mars"),
    "elon-musk-considers-move-to-mars",
  );
  assertEquals(
    slugify("Fintech startups raised $34B in 2019"),
    "fintech-startups-raised-34b-in-2019",
  );
  assertEquals(
    slugify("Shopify joins Facebook’s cryptocurrency Libra Association"),
    "shopify-joins-facebooks-cryptocurrency-libra-association",
  );
  assertEquals(
    slugify("What is a slug and how to optimize it?"),
    "what-is-a-slug-and-how-to-optimize-it",
  );
  assertEquals(
    slugify("Bitcoin soars past $33,000, its highest ever"),
    "bitcoin-soars-past-33000-its-highest-ever",
  );
});

Deno.test("slugify() works with non-Latin alphabetic text", () => {
  assertEquals(slugify("Συστημάτων Γραφής"), "συστημάτων-γραφής");
  assertEquals(
    slugify("列车运行前方是惠新西街南口站"),
    "列车运行前方是惠新西街南口站",
  );
});

Deno.test("slugify() converts non-Latin text to ASCII if using ICU charMap", () => {
  assertEquals(slugify("Συστημάτων Γραφής", { charMap }), "sistimaton-grafis");
  assertEquals(
    slugify("列车运行前方是惠新西街南口站", { charMap }),
    "lieche-yunxing-qianfang-shi-hui-xin-xijie-nankou-zhan",
  );
});

Deno.test("slugify() works with custom charMap", () => {
  assertEquals(
    slugify(
      "A B C",
      { charMap: new Map([["a", "x"], ["b", "y"], ["c", "z"]]) },
    ),
    "x-y-z",
  );
});

Deno.test("slugify() deletes non-Latin text if using empty charMap", () => {
  assertEquals(slugify("Συστημάτων Γραφής", { charMap: new Map() }), "-");
  assertEquals(
    slugify("列车运行前方是惠新西街南口站", { charMap: new Map() }),
    "-",
  );
});

Deno.test("slugify() deletes non-Latin text when strip: NON_ASCII and no charMap is provided", () => {
  assertEquals(slugify("Συστημάτων Γραφής", { strip: NON_ASCII }), "-");
  assertEquals(
    slugify("列车运行前方是惠新西街南口站", { strip: NON_ASCII }),
    "-",
  );
});

Deno.test("slugify() deletes non-matches when a custom strip regex is supplied", () => {
  assertEquals(slugify("abcdef", { strip: /[ace]/g }), "bdf");
});

Deno.test("slugify() strips apostrophes within words", () => {
  assertEquals(slugify("What’s up?"), "whats-up");
  assertEquals(slugify("What's up?"), "whats-up");
});

Deno.test("slugify() strips or replaces all non-alphanumeric ASCII chars except for `-`", () => {
  // Ensure that interpolation into all parts of a URL (path segment, search
  // params, hash, subdomain, etc.) is safe, i.e. doesn't allow path traversal
  // or other exploits, which could be allowed by presence of chars like
  // `./?&=#` etc.

  const ASCII_LOWER_ALPHANUM_OR_DASH_ONLY = /^[a-z0-9\-]+$/;
  const ALL_ASCII = Array.from(
    { length: 0x80 },
    (_, i) => String.fromCharCode(i),
  ).join("");

  assertMatch(slugify(ALL_ASCII), ASCII_LOWER_ALPHANUM_OR_DASH_ONLY);
  // even if we explicitly set the strip regex to match nothing
  assertMatch(
    slugify(ALL_ASCII, { strip: /[^\s\S]/gu }),
    ASCII_LOWER_ALPHANUM_OR_DASH_ONLY,
  );
});

Deno.test("slugify() converts Wikipedia titles in various languages", async (t) => {
  /**
   * `text` is selected Wikipedia titles from each locale retrieved using:
   *
   * ```sh
   * curl "https://$LOCALE.wikipedia.org/w/api.php?action=query&format=json&list=random&formatversion=2&rnnamespace=0&rnlimit=50"
   * ```
   */
  const tests = [
    {
      locale: "ar",
      /**
       * Known limitation: Missing vowels - Arabic script usually doesn't mark vowels, so the
       * transliteration lacks them.
       */
      results: [
        {
          text: "الحركة الدولية للدفاع عن الأطفال الفلسطينين ضد بايدن",
          sansCharMap: "الحركة-الدولية-للدفاع-عن-الأطفال-الفلسطينين-ضد-بايدن",
          withCharMap: "alhrkh-aldwlyh-lldfa-n-alatfal-alflstynyn-zd-baydn",
        },
        {
          text: "الأبرشية الرومانية الكاثوليكية في بالانغكارايا",
          sansCharMap: "الأبرشية-الرومانية-الكاثوليكية-في-بالانغكارايا",
          withCharMap: "alabrshyh-alrwmanyh-alkaswlykyh-fy-balanghkaraya",
        },
        {
          text: "انتخابات مجلس الأمن التابع للأمم المتحدة 2020",
          sansCharMap: "انتخابات-مجلس-الأمن-التابع-للأمم-المتحدة-2020",
          withCharMap: "antkhabat-mjls-alamn-altab-llamm-almthdh-2020",
        },
      ],
    },
    {
      locale: "de",
      results: [
        {
          text:
            "Leichtathletik-Weltmeisterschaften 2007/Teilnehmer (Liechtenstein)",
          sansCharMap:
            "leichtathletik-weltmeisterschaften-2007-teilnehmer-liechtenstein",
          withCharMap:
            "leichtathletik-weltmeisterschaften-2007-teilnehmer-liechtenstein",
        },
        {
          text: "Kabardino-Balkarische Autonome Sozialistische Sowjetrepublik",
          sansCharMap:
            "kabardino-balkarische-autonome-sozialistische-sowjetrepublik",
          withCharMap:
            "kabardino-balkarische-autonome-sozialistische-sowjetrepublik",
        },
        {
          text: "Olympische Sommerspiele 2024/Teilnehmer (Vereinigte Staaten)",
          sansCharMap:
            "olympische-sommerspiele-2024-teilnehmer-vereinigte-staaten",
          withCharMap:
            "olympische-sommerspiele-2024-teilnehmer-vereinigte-staaten",
        },
      ],
    },
    {
      locale: "el",
      /**
       * Known limitation: We default to Modern Greek, so Ancient Greek
       * transliteration is not supported.
       */
      results: [
        {
          text:
            "Βραβείο Καλύτερου Διευθυντή Φωτογραφίας της Ένωσης Διαδικτυακών Κριτικών Κινηματογράφου",
          sansCharMap:
            "βραβείο-καλύτερου-διευθυντή-φωτογραφίας-της-ένωσης-διαδικτυακών-κριτικών-κινηματογράφου",
          withCharMap:
            "vravio-kaliterou-dhievthindi-fotografias-tis-enosis-dhiadhiktiakon-kritikon-kinimatografou",
        },
        {
          text:
            "Βραβείο Β' Γυναικείου Ρόλου της Ένωσης Κριτικών Κινηματογράφου του Σαν Ντιέγκο",
          sansCharMap:
            "βραβείο-β-γυναικείου-ρόλου-της-ένωσης-κριτικών-κινηματογράφου-του-σαν-ντιέγκο",
          withCharMap:
            "vravio-v-ginaikiou-rolou-tis-enosis-kritikon-kinimatografou-tou-san-ndiengo",
        },
        {
          text:
            "Καθεδρικός Ναός των Αγίου Μιχαήλ του Αρχάγγελου και Αγίου Φλοριανού",
          sansCharMap:
            "καθεδρικός-ναός-των-αγίου-μιχαήλ-του-αρχάγγελου-και-αγίου-φλοριανού",
          withCharMap:
            "kathedhrikos-naos-ton-agiou-mikhail-tou-arkhangelou-kai-agiou-florianou",
        },
      ],
    },
    {
      locale: "es",
      results: [
        {
          text: "Temporada 2018 del Campeonato Brasileño de Motovelocidade",
          sansCharMap:
            "temporada-2018-del-campeonato-brasileño-de-motovelocidade",
          withCharMap:
            "temporada-2018-del-campeonato-brasileno-de-motovelocidade",
        },
        {
          text: "Frente Nacional para la Implementación de la Constitución",
          sansCharMap:
            "frente-nacional-para-la-implementación-de-la-constitución",
          withCharMap:
            "frente-nacional-para-la-implementacion-de-la-constitucion",
        },
        {
          text: "La reina Enriqueta María con sir Jeffrey Hudson y un mono",
          sansCharMap:
            "la-reina-enriqueta-maría-con-sir-jeffrey-hudson-y-un-mono",
          withCharMap:
            "la-reina-enriqueta-maria-con-sir-jeffrey-hudson-y-un-mono",
        },
      ],
    },
    {
      locale: "ja",
      /**
       * Known limitation: Kanji is transliterated using Chinese pronunciation rather than Japanese.
       * This is because the Unicode characters used are the same due to [Han unification](https://en.wikipedia.org/wiki/Han_unification)
       */
      results: [
        {
          text: "コンティニュイング・ケア・リタイアメント・コミュニティ",
          sansCharMap: "コンティニュイング-ケア-リタイアメント-コミュニティ",
          withCharMap: "konte-ni-ingu-kea-ritaiamento-komyunite",
        },
        {
          text: "ニューヨーク映画批評家協会賞 ノンフィクション映画賞",
          sansCharMap: "ニューヨーク映画批評家協会賞-ノンフィクション映画賞",
          withCharMap:
            "nyu-yoku-yinghua-pipingjia-xiehui-shang-nonfukushon-yinghua-shang",
        },
        {
          text: "ヴィルヘルム・ルートヴィヒ (ヴュルテンベルク公)",
          sansCharMap: "ヴィルヘルム-ルートヴィヒ-ヴュルテンベルク公",
          withCharMap: "vruherumu-ru-tohi-vrutenberu-ku-gong",
        },
      ],
    },
    {
      locale: "ru",
      results: [
        {
          text:
            "500 величайших альбомов всех времён по версии журнала Rolling Stone",
          sansCharMap:
            "500-величайших-альбомов-всех-времён-по-версии-журнала-rolling-stone",
          withCharMap:
            "500-velichayshix-alibomov-vsex-vremyon-po-versii-jurnala-rolling-stone",
        },
        {
          text:
            "Премия Правительства Российской Федерации в области образования",
          sansCharMap:
            "премия-правительства-российской-федерации-в-области-образования",
          withCharMap:
            "premiya-pravitelistva-rossiyskoy-federatsii-v-oblasti-obrazovaniya",
        },
        {
          text: "Статья 5 Конвенции о защите прав человека и основных свобод",
          sansCharMap:
            "статья-5-конвенции-о-защите-прав-человека-и-основных-свобод",
          withCharMap:
            "statiya-5-konventsii-o-zashchite-prav-cheloveka-i-osnovnyx-svobod",
        },
      ],
    },
    {
      locale: "th",
      /**
       * Known limitation: The only Thai transcription currently available in
       * ICU is the [ISO 11940](https://en.wikipedia.org/wiki/ISO_11940)
       * standard, which isn't very phonetic and thus has poor readability.
       */
      results: [
        {
          text:
            "จังหวัดมุกดาหารในการเลือกตั้งสมาชิกสภาผู้แทนราษฎรไทยเป็นการทั่วไป พ.ศ. 2562",
          sansCharMap:
            "จังหวัดมุกดาหารในการเลือกตั้งสมาชิกสภาผู้แทนราษฎรไทยเป็นการทั่วไป-พ-ศ-2562",
          withCharMap:
            "canghwad-mukdahar-n-kar-eluxk-tang-smaik-spha-phu-n-radr-iy-epnkar-awip-s-2562",
        },
        {
          text: "จังหวัดภูเก็ตในการเลือกตั้งสมาชิกสภาผู้แทนราษฎรไทยเป็นการทั่วไป พ.ศ. 2519",
          sansCharMap:
            "จังหวัดภูเก็ตในการเลือกตั้งสมาชิกสภาผู้แทนราษฎรไทยเป็นการทั่วไป-พ-ศ-2519",
          withCharMap:
            "canghwad-phuekt-n-kar-eluxk-tang-smaik-spha-phu-n-radr-iy-epnkar-awip-s-2519",
        },
        {
          text: "จังหวัดสงขลาในการเลือกตั้งสมาชิกสภาผู้แทนราษฎรไทยเป็นการทั่วไป พ.ศ. 2562",
          sansCharMap:
            "จังหวัดสงขลาในการเลือกตั้งสมาชิกสภาผู้แทนราษฎรไทยเป็นการทั่วไป-พ-ศ-2562",
          withCharMap:
            "canghwad-sngkhla-n-kar-eluxk-tang-smaik-spha-phu-n-radr-iy-epnkar-awip-s-2562",
        },
      ],
    },
    {
      locale: "vi",
      results: [
        {
          text: "Cục Phát thanh, truyền hình và thông tin điện tử (Việt Nam)",
          sansCharMap:
            "cục-phát-thanh-truyền-hình-và-thông-tin-điện-tử-việt-nam",
          withCharMap:
            "cuc-phat-thanh-truyen-hinh-va-thong-tin-dien-tu-viet-nam",
        },
        {
          text: "Dòng thời gian của đại dịch COVID-19 tháng 1 năm 2020",
          sansCharMap: "dòng-thời-gian-của-đại-dịch-covid-19-tháng-1-năm-2020",
          withCharMap: "dong-thoi-gian-cua-dai-dich-covid-19-thang-1-nam-2020",
        },
        {
          text: "Lãnh tụ Khối Đồng minh Chiến tranh thế giới thứ hai",
          sansCharMap: "lãnh-tụ-khối-đồng-minh-chiến-tranh-thế-giới-thứ-hai",
          withCharMap: "lanh-tu-khoi-dong-minh-chien-tranh-the-gioi-thu-hai",
        },
      ],
    },
    {
      locale: "zh",
      /**
       * Known limitations:
       * - We implement transliteration with a simple char map, so in some
       *   cases the best in-context transliteration may not be used for a
       *   given char placement.
       * - The char map normalizes all its target char sequences to basic ASCII
       *   by stripping diacritics, so tones are not marked, and Pinyin "ü"
       *   becomes "u" (not "v").
       */
      results: [
        {
          text: "2020年夏季奧林匹克運動會輕艇女子500公尺單人愛斯基摩艇比賽",
          sansCharMap:
            "2020年夏季奧林匹克運動會輕艇女子500公尺單人愛斯基摩艇比賽",
          withCharMap:
            "2020-nian-xiaji-aolinpike-yundonghui-qing-ting-nuzi-500-gongchi-danren-aisijimo-ting-bisai",
        },
        {
          text: "T57/58次列车 (1950-2007年)",
          sansCharMap: "t57-58次列车-1950-2007年",
          withCharMap: "t57-58-ci-lieche-1950-2007-nian",
        },
        {
          text: "哈马德·本·贾西姆·本·贾比尔·阿勒萨尼",
          sansCharMap: "哈马德-本-贾西姆-本-贾比尔-阿勒萨尼",
          withCharMap: "ha-ma-de-ben-jia-xi-mu-ben-jia-bi-er-a-lei-sa-ni",
        },
      ],
    },
  ];

  const name = new Intl.DisplayNames("en-US", { type: "language" });

  for (const { locale, results } of tests) {
    await t.step(name.of(locale) ?? locale, () => {
      for (const { text, sansCharMap, withCharMap } of results) {
        assertEquals(slugify(text), sansCharMap);
        assertEquals(slugify(text, { charMap }), withCharMap);
      }
    });
  }
});
