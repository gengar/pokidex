/*
 *   Copyright (C) 2010-2023, kaki
 *
 *   Redistribution and use in source and binary forms, with or without
 *   modification, are permitted provided that the following conditions
 *   are met:
 *
 *   1. Redistributions of source code must retain the above copyright notice,
 *      this list of conditions and the following disclaimer.
 *
 *   2. Redistributions in binary form must reproduce the above copyright
 *      notice, this list of conditions and the following disclaimer in the
 *      documentation and/or other materials provided with the distribution.
 *
 *   THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 *  “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 *   LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 *   A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 *   HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 *   SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 *   TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *   PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 *   LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 *   NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 *   SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

function roma(str, withSuffix = false, keepRaw = false) {
  const table = roma.table;
  const keep = keepRaw ?
        (orig, pat) => `(?:${orig}|${pat})` :
        (orig, pat) => pat;
  function withKeep(subst) {
    return (sub, ...args) => keep(sub, subst(sub, ...args));
  }

  const bodyReg = /(([b-df-hj-mp-tv-z])\2*(?=\2))|((?:[b-df-hj-np-tv-z]|[cw]h|[b-df-hj-npr-tv-xz]y|[bdgkmpstz][hw]|ts|)[aiueo]|[-0-9])|(xts?u)|(n(?!y?$)n?)/gi;
  function substBody(sub, gs1, _, s, gs2, sn) {
    if (gs1) {
      if (gs1.length == 1) {
        return "[っッ]";
      }
      else {
        return "[っッ]{" + gs1.length + "}";
      }
    }
    else if (s) {
      return table[s];
    }
    else if (gs2) {
      return "[っッ]";
    }
    else if (sn) {
      return "[んン]";
    }
    else {
      throw new roma.Error(`substBody: ${sub}`);
    }
  }

  const tailReg = /(?:(x[kw])|(xts?)|([b-df-hj-npr-tv-xz]y|[b-dgkmpstz][hw]|[qy]|ts)|(n)|([fhjlrv])|(c)|(w)|([bdgkmpsz])|(t)|(x))$/;
  // x[kw]        a
  // xts?         u
  // ([qy]|ts)    [aiueo]
  // (n)          (n|y?[aiueo])
  // ([fhjlnrv])  y?[aiueo]
  // (c)          [yh]?[aiueo]
  // (w)          y[ie]|h?[aiueo]
  // ([bdgkmpsz]) [yhw]?[aiueo]
  // t            [yhws]?[aiueo]
  // x            (y?[aiueo]|[kw]a|tu)
  function substTail(sub, xkw, xts, qy, n, fhj, c, w, bdg, t, x) {
    if (xkw) {
      return table[xkw + "a"];
    }
    else if (xts) {
      return table[xts + "u"];
    }
    const vowels = ["a", "i", "u", "e", "o"];
    function f(consonants) {
      const ary = [];
      for (const i of vowels) {
        ary.push(table[sub + i]);
      }
      for (const c of consonants) {
        for (const v of vowels) {
          ary.push(table[sub + c + v]);
        }
      }
      return ary;
    }
    let ary;
    if (qy) {
      ary = f([]);
    }
    else if (n) {
      ary = f(["y"]);
      ary.push(table["n"]);
    }
    else if (fhj) {
      ary = f(["y"]);
    }
    else if (c) {
      ary = f(["y", "h"]);
    }
    else if (w) {
      ary = f(["h"]);
      ary.push(table["wyi"], table["wye"]);
    }
    else if (bdg) {
      ary = f(["y", "h", "w"]);
    }
    else if (t) {
      ary = f(["y", "h", "w", "s"]);
    }
    else if (x) {
      ary = f(["y"]);
      ary.push(table["xtu"], table["xka"] ,table["xwa"]);
    }
    else {
      throw new roma.Error(`substTail: ${sub}`);
    }
    if (sub.length > 1) {
      return "(?:" + ary.join("|") + ")";
    }
    else {
      return "[っッ]*(?:"  + ary.join("|") + ")";
    }
  }

  const str2 = str.replace(/[\\^$*+?.()|[\]{}]/g, "\\$&").replace(bodyReg, withKeep(substBody));
  return withSuffix ?
    str2.replace(tailReg, withKeep(substTail)) :
    str2.replace(/n$/, "[んン]");
}

roma.Error = class RomaError extends Error {};

roma.table = {
  a: "[あア]", i: "[いイ]", u: "[うウ]", e: "[えエ]", o: "[おオ]",
  ba: "[ばバ]", bi: "[びビ]", bu: "[ぶブ]", be: "[べベ]", bo: "[ぼボ]",
  bya: "[びビ][ゃャ]", byi: "[びビ][ぃィ]", byu: "[びビ][ゅュ]", bye: "[びビ][ぇェ]", byo: "[びビ][ょョ]",
  bha: "[ばバ][ぁァ]", bhi: "[ばバ][ぃィ]", bhu: "[ばバ][ぅゥ]", bhe: "[ばバ][ぃィ]", bho: "[ばバ][ぃィ]",
  bwa: "[びビ][ゎヮ]", bwi: "[びビ][ぃィ]", bwu: "[びビ][ぅゥ]", bwe: "[びビ][ぇェ]", bwo: "[びビ][ぉォ]",
  ca: "[かカ]", ci: "[しシ]", cu: "[くク]", ce: "[せセ]", co: "[こコ]",
  cya: "[ちチ][ゃャ]", cyi: "[ちチ][ぃィ]", cyu: "[ちチ][ゅュ]", cye: "[ちチ][ぇェ]", cyo: "[ちチ][ょョ]",
  cha: "[ちチ][ゃャ]", chi: "[ちチ]", chu: "[ちチ][ゅュ]", che: "[ちチ][ぇェ]", cho: "[ちチ][ょョ]",
  da: "[だダ]", di: "[ぢヂ]", du: "[づヅ]", de: "[でデ]", "do": "[どド]",
  dya: "[ぢヂ][ゃャ]", dyi: "[ぢヂ][ぃィ]", dyu: "[ぢヂ][ゅュ]", dye: "[ぢヂ][ぇェ]", dyo: "[ぢヂ][ょョ]",
  dha: "[でデ][ゃャ]", dhi: "[でデ][ぃィ]", dhu: "[でデ][ゅュ]", dhe: "[でデ][ぇェ]", dho: "[でデ][ょョ]",
  dwa: "[どド][ぁァ]", dwi: "[どド][ぃィ]", dwu: "[どド][ぅゥ]", dwe: "[どド][ぇェ]", dwo: "[どド][ぉォ]",
  fa: "[ふフ][ぁァ]", fi: "[ふフ][ぃィ]", fu: "[ふフ]", fe: "[ふフ][ぇェ]", fo: "[ふフ][ぉォ]",
  fya: "[ふフ][ゃャ]", fyi: "[ふフ][ぃィ]", fyu: "[ふフ][ゅュ]", fye: "[ふフ][ぇェ]", fyo: "[ふフ][ょョ]",
  ga: "[がガ]", gi: "[ぎギ]", gu: "[ぐグ]", ge: "[げゲ]", go: "[ごゴ]",
  gya: "[ぎギ][ゃャ]", gyi: "[ぎギ][ぃィ]", gyu: "[ぎギ][ゅュ]", gye: "[ぎギ][ぇェ]", gyo: "[ぎギ][ょョ]",
  gha: "[ぐグ][ぁァ]", ghi: "[ぐグ][ぃィ]", ghu: "[ぐグ][ぅゥ]", ghe: "[ぐグ][ぇェ]", gho: "[ぐグ][ぉォ]",
  gwa: "[ぐグ][ぁァ]", gwi: "[ぐグ][ぃィ]", gwu: "[ぐグ][ぅゥ]", gwe: "[ぐグ][ぇェ]", gwo: "[ぐグ][ぉォ]",
  ha: "[はハ]", hi: "[ひヒ]", hu: "[ふフ]", he: "[へヘ]", ho: "[ほホ]",
  hya: "[ひヒ][ゃャ]", hyi: "[ひヒ][ぃィ]", hyu: "[ひヒ][ゅュ]", hye: "[ひヒ][ぇェ]", hyo: "[ひヒ][ょョ]",
  ja: "[じジ][ゃャ]", ji: "[じジ]", ju: "[じジ][ゅュ]", je: "[じジ][ぇェ]", jo: "[じジ][ょョ]",
  jya: "[じジ][ゃャ]", jyi: "[じジ][ぃィ]", jyu: "[じジ][ゅュ]", jye: "[じジ][ぇェ]", jyo: "[じジ][ょョ]",
  ka: "[かカ]", ki: "[きキ]", ku: "[くク]", ke: "[けケ]", ko: "[こコ]",
  kya: "[きキ][ゃャ]", kyi: "[きキ][ぃィ]", kyu: "[きキ][ゅュ]", kye: "[きキ][ぇェ]", kyo: "[きキ][ょョ]",
  kha: "[くク][ぁァ]", khi: "[くク][ぃィ]", khu: "[くク][ぅゥ]", khe: "[くク][ぇェ]", kho: "[くク][ぉォ]",
  kwa: "[くク][ぁァ]", kwi: "[くク][ぃィ]", kwu: "[くク][ぅゥ]", kwe: "[くク][ぇェ]", kwo: "[くク][ぉォ]",
  la: "[らラ]", li: "[りリ]", lu: "[るル]", le: "[れレ]", lo: "[ろロ]",
  lya: "[りリ][ゃャ]", lyi: "[りリ][ぃィ]", lyu: "[りリ][ゅュ]", lye: "[りリ][ぇェ]", lyo: "[りリ][ょョ]",
  ma: "[まマ]", mi: "[みミ]", mu: "[むム]", me: "[めメ]", mo: "[もモ]",
  mya: "[みミ][ゃャ]", myi: "[みミ][ぃィ]", myu: "[みミ][ゅュ]", mye: "[みミ][ぇェ]", myo: "[みミ][ょョ]",
  mha: "[むム][ぁァ]", mhi: "[むム][ぃィ]", mhu: "[むム][ぅゥ]", mhe: "[むム][ぇェ]", mho: "[むム][ぉォ]",
  mwa: "[むム][ゎヮ]", mwi: "[むム][ぃィ]", mwu: "[むム][ぅゥ]", mwe: "[むム][ぇェ]", mwo: "[むム][ぉォ]",
  na: "[なナ]", ni: "[にニ]", nu: "[ぬヌ]", ne: "[ねネ]", no: "[のノ]",
  nya: "[にニ][ゃャ]", nyi: "[にニ][ぃィ]", nyu: "[にニ][ゅュ]", nye: "[にニ][ぇェ]", nyo: "[にニ][ょョ]",
  n: "[んン]", nn: "[んン]",
  pa: "[ぱパ]", pi: "[ぴピ]", pu: "[ぷプ]", pe: "[ぺペ]", po: "[ぽポ]",
  pya: "[ぴピ][ゃャ]", pyi: "[ぴピ][ぃィ]", pyu: "[ぴピ][ゅュ]", pye: "[ぴピ][ぇェ]", pyo: "[ぴピ][ょョ]",
  pha: "[ぷプ][ぁァ]", phi: "[ぷプ][ぃィ]", phu: "[ぷプ][ぅゥ]", phe: "[ぷプ][ぇェ]", pho: "[ぷプ][ぉォ]",
  pwa: "[ぷプ][ゎヮ]", pwi: "[ぷプ][ぃィ]", pwu: "[ぷプ][ぅゥ]", pwe: "[ぷプ][ぇェ]", pwo: "[ぷプ][ぉォ]",
  qa: "[くク][ぁァ]", qi: "[くク][ぃィ]", qu: "[くク][ぅゥ]", qe: "[くク][ぇェ]", qo: "[くク][ぉォ]",
  ra: "[らラ]", ri: "[りリ]", ru: "[るル]", re: "[れレ]", ro: "[ろロ]",
  rya: "[りリ][ゃャ]", ryi: "[りリ][ぃィ]", ryu: "[りリ][ゅュ]", rye: "[りリ][ぇェ]", ryo: "[りリ][ょョ]",
  sa: "[さサ]", si: "[しシ]", su: "[すス]", se: "[せセ]", so: "[そソ]",
  sya: "[しシ][ゃャ]", syi: "[しシ][ぃィ]", syu: "[しシ][ゅュ]", sye: "[しシ][ぇェ]", syo: "[しシ][ょョ]",
  sha: "[しシ][ゃャ]", shi: "[しシ]", shu: "[しシ][ゅュ]", she: "[しシ][ぇェ]", sho: "[しシ][ょョ]",
  swa: "[すス][ぁァ]", swi: "[すス][ぃィ]", swu: "[すス][ぅゥ]", swe: "[すス][ぇェ]", swo: "[すス][ぉォ]",
  ta: "[たタ]", ti: "[ちチ]", tu: "[つツ]", te: "[てテ]", to: "[とト]",
  tya: "[ちチ][ゃャ]", tyi: "[ちチ][ぃィ]", tyu: "[ちチ][ゅュ]", tye: "[ちチ][ぇェ]", tyo: "[ちチ][ょョ]",
  tha: "[てテ][ゃャ]", thi: "[てテ][ぃィ]", thu: "[てテ][ゅュ]", the: "[てテ][ぇェ]", tho: "[てテ][ょョ]",
  twa: "[とト][ぁァ]", twi: "[とト][ぃィ]", twu: "[とト][ぅゥ]", twe: "[とト][ぇェ]", two: "[とト][ぉォ]",
  va: "[ゔヴ][ぁァ]", vi: "[ゔヴ][ぃィ]", vu: "[ゔヴ]", ve: "[ゔヴ][ぇェ]", vo: "[ゔヴ][ぉォ]",
  vya: "[ゔヴ][ゃャ]", vyi: "[ゔヴ][ぃィ]", vyu: "[ゔヴ][ゅュ]", vye: "[ゔヴ][ぇェ]", vyo: "[ゔヴ][ょョ]",
  wa: "[わワ]", wi: "[うウ][ぃィ]", wu: "[うウ]", we: "[うウ][ぇェ]", wo: "[をヲ]",
  wyi: "[ゐヰ]", wye: "[ゑヱ]",
  wha: "[うウ][ぁァ]", whi: "[うウ][ぃィ]", whu: "[うウ]", whe: "[うウ][ぇェ]", who: "[うウ][ぉォ]",
  xa: "[ぁァ]", xi: "[ぃィ]", xu: "[ぅゥ]", xe: "[ぇェ]", xo: "[ぉォ]", xtu: "[っッ]", xtsu: "[っッ]",
  xya: "[ゃャ]", xyi: "[ぃィ]", xyu: "[ゅュ]", xye: "[ぇェ]", xyo: "[ょョ]", xka: "ヵ", xwa: "[ゎヮ]",
  ya: "[やヤ]", yi: "[いイ]", yu: "[ゆユ]", ye: "[いイ][ぇェ]", yo: "[よヨ]",
  za: "[ざザ]", zi: "[じジ]", zu: "[ずズ]", ze: "[ぜゼ]", zo: "[ぞゾ]",
  zya: "[じジ][ゃャ]", zyi: "[じジ][ぃィ]", zyu: "[じジ][ゅュ]", zye: "[じジ][ぇェ]", zyo: "[じジ][ょョ]",
  zha: "[ずズ][ぁァ]", zhi: "[ずズ][ぃィ]", zhu: "[ずズ][ぅゥ]", zhe: "[ずズ][ぇェ]", zho: "[ずズ][ぉォ]",
  zwa: "[ずズ][ゎヮ]", zwi: "[ずズ][ぃィ]", zwu: "[ずズ][ぅゥ]", zwe: "[ずズ][ぇェ]", zwo: "[ずズ][ぉォ]",
  tsa: "[つツ][ぁァ]", tsi: "[つツ][ぃィ]", tsu: "[つツ]", tse: "[つツ][ぇェ]", tso: "[つツ][ぉォ]",
  0: "０", 1: "１", 2: "２", 3: "３", 4: "４", 5: "５", 6: "６", 7: "７", 8: "８", 9: "９", "-": "ー"
};

/*
 * bya bha bwa
 * cya cha     chi
 * dya dha dwa
 * fya
 * gya gha gwa
 * hya
 * jya
 * kya kha kwa
 * lya
 * mya mha mwa
 * nya         n nn
 * pya pha pwa
 * q
 * rya
 * sya sha swa
 * tya tha twa
 * vya
 * wya wha
 * xya         xtsu xtu
 * y
 * zya zha zwa
 * tsa
 *
 * [cw]h[aiueo]
 * [b-df-hj-npr-tvxz]y
 * [bdgkmpstz][hw]
 * xts?u
 * nn?
 *
 */
