// ICU transliteration parsing peggy grammar
// ==========================

{
  const vars = Object.create(null)

  function _lookup(val) {
    return val.startsWith('$')
      ? (vars[val] ?? null)
      : val
  }

  function lookup(val) {
    if (Array.isArray(val)) {
      const out = val.map((v) => _lookup(v))
      return out.length ? out : null
    }

    return _lookup(val)
  }

  function hexToChar(hexDigits) {
    return String.fromCodePoint(parseInt(hexDigits.join(""), 16))
  }
}

Document
  = head:Line tail:(Line)* {
    return {
      vars,
      lines: [head, ...tail].filter((x) => x != null),
    }
  }

Comment = _ "#" [^\n\r]*
EmptyLine = (Comment / [\r\n])+ { return null }

Line
  = EmptyLine / line:(_ LineContent _ Comment? [\r\n]*) { return line[1]; }

LineContent
  = Mapping / Unrecognized { return null }

Mapping
  = _ lhs:Lhs _ op:Operator _ rhs:Rhs _ ";" {
    switch (op) {
      case '=': {
        vars[lhs] = rhs;
        return null;
      }
      default: {
        const l = lookup(lhs)
        const r = lookup(rhs)
        if (l == null || r == null) return null
        return { t: text(), lhs: l, op, rhs: r };
      }
    }
  }

Identifier
  = "$" [a-zA-Z0-9]+ { return text() }

CharRule
  = Identifier / CharClass / ch:(_ Char _)* { return ch.flat().join("").replaceAll(/\s+/g, "") }

Char
  = id:Identifier { return lookup(id) }
    / Escape
    / (([\uD800-\uDBFF] [\uDC00-\uDFFF])
    / [^ \n\r\[\]\-<>→↔=;]) { return text() }

Hex = [0-9a-fA-F]

Escape = Uescape / Xescape / MalformedUescape
Xescape = "\\x" h:(Hex Hex) { return hexToChar(h) }
Uescape = "\\u" h:(Hex Hex Hex Hex) { return hexToChar(h) }
// only occurs on one line in one file in the icu repo 🤷
// https://github.com/unicode-org/icu/blob/f062f52c123f436eb1142115ba2e4e7b65a4ac8f/icu4c/source/data/translit/my_my_Latn.txt#L130
MalformedUescape = "\\" h:(Hex Hex Hex Hex) { return hexToChar(h) }

CharClass
  = "[" ch:(CharRange / Char)* "]" { return ch.flat() }

CharRange
  = from:Char "-" to:Char {
    const [fromCp, toCp] = [from, to].map((x) => x.codePointAt(0))
    return Array.from(
      { length: toCp - fromCp + 1 },
      (_, i) => String.fromCodePoint(fromCp + i),
    )
   }

// icu/icu4j/main/translit/src/main/java/com/ibm/icu/text/Transliterator.java:
// > <p>Note: Another description of the Transliterator rule syntax is available in
// > <a href="https://www.unicode.org/reports/tr35/tr35-general.html#Transform_Rules_Syntax">section
// > Transform Rules Syntax of UTS #35: Unicode LDML</a>.
// > The rules are shown there using arrow symbols ← and → and ↔.
// > ICU supports both those and the equivalent ASCII symbols &lt; and &gt; and &lt;&gt;.
Operator
  = ([→>↔=] / "<>") { return text() }

Lhs
  = CharRule

Rhs
  = CharRule

// we just drop anything we don't explicitly handle
Unrecognized
  = [^\n\r]+ { return null }

_ "whitespace"
  = [ \t\n\r]*
