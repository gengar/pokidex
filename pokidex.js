/*
 *   Copyright (C) 2014-2023, kaki
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
const pokidexVersion = "0.2.0-alpha";

function message(str) {
  const echoArea = document.querySelector("#echo-area");
  if (str instanceof Node) {
    echoArea.innerHTML = "";
    echoArea.appendChild(str);
  }
  else {
    echoArea.textContent = str;
  }
}

function messageHTML(str) {
  document.querySelector("#echo-area").innerHTML = str;

}

function makeElement(tag, attr = undefined, ...args) {
  const node = document.createElement(tag);
  if (attr) {
    for (const i in attr) {
      if (attr[i] != undefined) {
        node[i] = attr[i];
      }
    }
  }
  for (const e of args) {
    node.appendChild(e instanceof Node ? e : document.createTextNode(e));
  }
  return node;
}

function makeInput(type, name, attr = undefined) {
  const input = makeElement("input", attr);
  input.type = type;
  input.name = name;
  return input;
}

const fontSize = (() => {
  const style = window.getComputedStyle(document.documentElement).fontSize;

  if (!/px$/.test(style)) {
    console.warn("font-sizeにpx以外の単位が使われています: %s", style);
  }

  return parseFloat(style);
})();

const inputDomainMap = new Map();

function makeInputText(name, size, placeholder, completionHandler = undefined) {
  const input = makeInput("text", name, { placeholder: placeholder });
  input.style.width = (fontSize - 1) * size + "px";
  if (completionHandler) {
    completionHandler.add(input);
    inputDomainMap.set(input, completionHandler.source);
  }
  return input;
}

function makeInputNumber(name, size, min, max, init) {
  const input = makeInput("number", name, {min: min, max: max});
  input.style.width = size + 3 + "ex";
  input.value = input.dataset.default = init;
  return input;
}

function makeInputButton(name, value, action) {
  return makeInput("button", name, {value: value, onclick: action});
}

function makeCheckbox(name, text) {
  return makeElement("span", null,
                     makeInput("checkbox", name, {"id": name}),
                     makeElement("label", {"htmlFor": name}, text));
}

function makeSelectFromArray(name, ary, none) {
  const select = document.createElement("select");
  select.name = name;
  select.appendChild(makeElement("option", {"value": ""}, none));
  for (const i in ary) {
    select.appendChild(makeElement("option", {"value": i}, ary[i]));
  }
  return select;
}

function makeRadioButtons(name, ...alist) {
  return alist.map((pair, i) => {
    const [text, value] = pair;
    const id = name + i;
    return makeElement("div", null,
                       makeInput("radio", name, {value, id}),
                       makeElement("label", {"htmlFor": id}, text));
  });
}

function scrollToNode(node) {
  window.scrollTo(0, node.offsetTop);
}

function makeAnchor(text, target) {
  const anchor = makeElement("a", null, text);
  anchor.addEventListener("click", ev => {
    ev.preventDefault();
    scrollToNode(target);
  });
  anchor.href = location.href;
;
  return anchor;
}

function makeInputBox(id, ...args) {
  const node = document.createElement("div");
  node.id = id;
  node.className = "input-box";
  for (const e of args) {
    node.appendChild(e);
  }
  return node;
}

function makeDiv(klass, ...args) {
  return makeElement("div", {"className": klass}, ...args);
}

function makeBlock(name, htext, text) {
  const div = document.createElement("div");
  const hline = makeElement("h3", null, htext);
  div.className = name;
  div.appendChild(hline);
  div.appendChild(makeElement("pre", null, text));
  return div;
}

function makeImage(name, path, title) {
  const img = document.createElement("img");
  img.src = path;
  img.className = name;
  img.title = title;
  img.addEventListener("load", ev => {
    img.height = img.naturalHeight * 2;
    img.width = img.naturalWidth * 2;
  });
  return img;
}



function makeIndex() {
  const prevIndexList = document.querySelector("#index-list");
  const indexList = makeElement("ul", {id: "index-list"});

  document.querySelector("#result").childNodes.forEach(
    node => indexList.appendChild(makeElement("li", null, makeAnchor(node.dataset.title, node)))
  );
  prevIndexList.parentNode.replaceChild(indexList, prevIndexList);
}



function getPokemonFromNameOrID(key) {
  const poke = PokeData.fromName(key) ?? PokeData.fromID(parseInt(key));
  if (poke) {
    return poke;
  }
  else {
    throw new MessageException("エラー: 存在しない種族名またはID");
  }
}

function makeResultCloser(node) {
  const div = document.createElement("div");
  div.appendChild(makeInputButton(null, "閉じる", ev => {
    node.parentNode.removeChild(node);
    makeIndex();
  }));
  div.className = "close";
  return div;
}

function makeResultArticle(title) {
  const page = makeElement("article");
  page.appendChild(makeResultCloser(page));

  const data = page.dataset;
  data.title = title;

  return page;
}

function insertResult(node, position = undefined) {
  const result = document.querySelector("#result");
  result.insertBefore(node, position ? position.nextSibling : result.firstChild);
  makeIndex();
}

function withOutputResultArticle(title, func,
                                 scroll = false, position = undefined) {
  const page = makeResultArticle(title);
  try {
    return func(page);
  }
  finally {
    insertResult(page, position);
    scroll && scrollToNode(page);
  }
}

function makeTextLinkToPokidex(name, position, text) {
  const e = document.createElement("a");
  e.href = location.href;
  e.addEventListener("click", ev => {
    ev.preventDefault(), showPokidex(name, position);
  });
  e.textContent = text != null ? text : name;
  return e;
}

class MessageException {
  constructor(mes) {
    this.message = mes;
  }
}

function showPokidex(name, position = undefined) {
  const p = getPokemonFromNameOrID(name);

  function formatLV(n) {
    return n < 10 ? " " + n : "" + n;
  }
  function formatTMNumber(n) {
    return n < 10 ? " " + n :
      n <= 50 ? "" + n :
      n <= 57 ? "H" + (n - 50) : "--";
  }
  function formatEV1(triple) {
    const [id, type, value] = triple;
    let str = "No. " + id + " " + PokeData.fromID(id).name + "(";
    if (type === 1) {
      str += "Lv " + value;
    }
    else if (type === 2) {
      str += "石";
    }
    else if (type === 3) {
      str += "通信";
    }
    else if (type === 4) {
      str += "なつき";
    }
    else if (type === 5) {
      str += "その他";
    }
    return str + ")";
  }
  function formatEV(evlist) {
    return evlist.map(formatEV1).join("\n");
  }
  function formatLearnings(alist) {
     return alist.map(e => "Lv " + formatLV(e[0]) + " : " + MoveData.fromID(e[1]).name).join("\n") + "\n";
  }
  function formatTM(ary, tmlist) {
     return ary.map(i => formatTMNumber(i) + " : " + tmlist[i].name).join("\n") + "\n";
  }

  withOutputResultArticle(p.name, page => {
    const outline =
          makeBlock(
            "pokidex-block",
            "No. " + p.id + " " + p.name,
            [[p.h, p.a, p.b, p.c, p.d, p.s].join("-") +
             " : " + p.sum(),
             PokeData.type[p.type1] + (p.type2 ? "/" + PokeData.type[p.type2] : ""),
             p.female ? "♀率: " + p.female + "/16" : "性別不明",
             "タマゴグループ: " + p.eggGroup.map(i => PokeData.eggGroup[i]).join("/"),
            ].join("\n"));
    if (p.evList) {
      const list = p.evList.map(triple =>
        makeElement("li", null,
                    makeTextLinkToPokidex(PokeData.fromID(triple[0]).name,
                                          page,
                                          formatEV1(triple))));
      outline.appendChild(makeElement("ul", {"className": "pokidex-ev-list"},
                                      ...list));
    }
    if (p.evFrom) {
      outline.appendChild(makeTextLinkToPokidex(
        p.evFrom, page,
        "← No. " + p.evFrom + " " + PokeData.fromID(p.evFrom).name));

    }

    page.appendChild(
      makeDiv(
        "pokidex-box",
        outline,
        makeDiv(
          "pokidex-block pokidex-icon-block",
          makeImage("pokidex-icon", "../img/crystal/" + p.id + ".png", "通常"),
          makeImage("pokidex-icon", "../img/crystal-shiny/" + p.id + ".png", "色違い"))));
    page.appendChild(
      makeDiv(
        "pokidex-box",
        makeBlock(
          "pokidex-block",
          "クリスタル版で覚える技",
          formatLearnings(p.crystalLearnings)),
        makeBlock(
          "pokidex-block",
          "ピカチュウ版で覚える技",
          formatLearnings(p.pikaLearnings))));
    page.appendChild(
      makeDiv(
        "pokidex-box",
        makeBlock(
          "pokidex-block",
          "わざマシン",
          formatTM(p.TMs, MoveData.TM)),
        makeBlock(
          "pokidex-block",
          "旧作わざマシン",
          formatTM(p.oldTMs, MoveData.oldTM))));
    page.appendChild(
      makeDiv(
        "pokidex-box",
        makeBlock(
          "pokidex-block",
          "タマゴわざ",
          p.origin().eggMoves.map(id => MoveData.fromID(id).name).join("\n")),
        ...p.gsLearnings ?
          [makeBlock("pokidex-block",
                     "金銀版で覚えられる技",
                     formatLearnings(p.gsLearnings))] :
          []));
  }, false, position);
}



function takeWhile(ary, f) {
  const r = [];
  for (const e of ary) {
    if (f(e)) {
      r.push(e);
    }
    else {
      break;
    }
  }
  return r;
}

function dropWhile(ary, f) {
  for (let i = 0; i < ary.length; i++) {
    if (!f(i)) {
      return ary.slice(i);
    }
  }
  return [];
}

function arrayIntersection(nd, er) {
  return nd.filter(i => er.includes(i));
}
function arrayDifference(nd, er) {
  return nd.filter(i => !er.includes(i));
}

function toSortedBy(ary, key, compare = (m, n) => m - n) {
  return ary.map(e =>
    [key(e), e]
  ).sort(([a, ], [b, ]) =>
    compare(a, b)
  ).map(
    ([, e]) => e
  );
}

function sortFunctions(order) {
  const [, name, method, ord] = /(?:([habcds])|(sum)\(\))([<>])/.exec(order);
  const key = method ?
        x => x[method]() :
        x => x[name];
  const compare = ord === "<" ?
        (m, n) => m - n :
        (m, n) => n - m;
  return [key, compare];
}

function filterLearningsBySelf(requirements, alist, level = 100) {
  return arrayDifference(requirements,
                         takeWhile(alist, t => t[0] <= level).
                         map(t => MoveData.fromID(t[1])));
}

function filterLearningsInCrystal(requirements, poke, level = 100) {
  return filterLearningsBySelf(requirements, poke.crystalLearnings, level);
}

function filterLearningsInPika(requirements, poke, level = 100) {
  return filterLearningsBySelf(requirements, poke.pikaLearnings, level);
}

function filterLearningsByTM(requirements, poke) {
  return arrayDifference(requirements,
                         poke.TMs.map(i => MoveData.TM[i]));
}

function filterLearningsByOldTM(requirements, poke) {
  return arrayDifference(requirements,
                         poke.oldTMs.map(i => MoveData.oldTM[i]));
}

function filterLeaningsFinalForm(requirements, poke, level = 100) {
  return filterLearningsInCrystal(filterLearningsByTM(requirements, poke, level),
                                  poke,
                                  level);
}

// AND検索
function pokeCanLearnMovesProduct0(poke, moves, level = 100) {
  let rest = filterLeaningsFinalForm(moves, poke, level);

  if (poke.name === "ドーブル") {
    rest = rest.filter(move => MoveData.cantSketch.includes(move.id));
  }

  const origin = poke.origin();
  rest = arrayDifference(rest, origin.eggMoves.map(id => MoveData.fromID(id)));

  let p;
  for (let id = poke.id; id; id = p.evFrom) {
    p = PokeData.fromID(id);
    rest = filterLeaningsFinalForm(rest, p, level);
    rest = filterLearningsInPika(rest, p, level);
    rest = filterLearningsByOldTM(rest, p);

    if (p.gsLearnings) {
      rest = filterLearningsBySelf(rest, p.gsLearnings, level);
    }
  }

  return rest.length <= 0;
}

function pokeCanLearnMovesProduct(page, pokes0, moves, lv, types, eggGroups, order) {
  const pokes = pokes0.filter(poke => pokeCanLearnMovesProduct0(poke, moves, lv));
  const sortFuncs = order && sortFunctions(order);
  const ul = document.createElement("ul");

  (order ?
   (([key, compare]) => toSortedBy(pokes, key, compare))(sortFuncs) :
   pokes
  ).forEach(poke => {
    const link = makeTextLinkToPokidex(poke.name, page);
    if (order) {
      link.appendChild(document.createTextNode(`(${sortFuncs[0](poke)})`));
    }
    const li = document.createElement("li");
    li.appendChild(link);
    ul.appendChild(li);
  });
  page.appendChild(ul);
}


class SearchState {
  constructor(pokemon, level, description, request, learned = [], timeTraveling = false, timeTraveled = timeTraveling, prev = null) {
    this.pokemon = pokemon; // PokeData
    this.level = level;
    this.description = description;
    this.request = request; // [id]
    this.learned = learned; // [(id, description)]
    this.prev = prev;
    this.timeTraveling = timeTraveling;
    this.timeTraveled = timeTraveled;
  }
  derive(pokemon, level, description,
         request = this.request, learned = [],
         timeTraveling = this.timeTraveling,
         timeTraveled = timeTraveling || this.timeTraveled) {
    return new this.constructor(pokemon, level, description, request, learned,
                                timeTraveling, timeTraveled, this);
  }
  satisfied() {
    return this.request.length === 0;
  }
  toString() {
    const cur = `${this.pokemon.name} Lv ${this.level}, ${this.description}, learned: ${this.learned.map(([move, desc]) => `${MoveData.fromID(move).name}/${desc}` )} request: ${this.request.map(id => MoveData.fromID(id).name)}`;
    const traveling = this.timeTraveling ? " (traveling)" : "" ;
    const traveled = this.timeTraveled ? " (traveled)" : "" ;
    const pre = this.prev ? ` <- ${this.prev.toString()}` : "";

    return `[SearchState ${cur}${traveling}${traveled}${pre}]`;
  }
}

// 進化後のポケモンから進化前のポケモンの進化レベルを返す
// 進化しないポケモンは 0 任意進化は 1
function inspectEvolvement(poke) {
  if (poke.evFrom) {
    const [to, evType, value] = poke.evFromPoke().evList.find(([id, , ]) => id === poke.id);
    return (evType === 1) ? value :
      (evType === 4 || evType === 5) ? 6 :
      1;
  }
  else {
    return 0;
  }
}

// NB: ニドリーナニドクインは未発見
function breedableEggGroups(poke) {
  const eggDragon = 12;
  const eggUndiscovered = 15;
  const egs = poke.eggGroup;
  if (egs[0] === eggUndiscovered) {
    // ベビィポケモン
    if (poke.evList.length > 0) {
      return breedableEggGroups(PokeData.fromID(poke.evList[0][0]));
    }
    else {
      return [];
    }
  }
  return poke.eggGroup.filter(g => g <= eggDragon);
}

function maleExists(poke) {
  const female = poke.female;
  return female != null && (female < 16);
}

function learn(request, description, pred) {
  const left = [], right = [];
  request.forEach(e => {
    if (pred(e)) {
      right.push([e, description]);
    }
    else {
      left.push(e);
    }
  });
  return [left, right];
}

function useTMs(state) {
  const {pokemon: poke, level, request, learned, timeTraveling} = state;
  const [learnings, extraLearnings, tms, desc] = timeTraveling ?
        [poke.pikaLearnings, [], poke.oldTMMoves, "わざマシン(ピ)"] :
        [poke.crystalLearnings, poke.gsLearnings ?? [], poke.TMMoves, "わざマシン(ク)"];
  const getMoves = alist => takeWhile(alist,
                                      ([lv, ]) => lv <= level
                                     ).map(([, move]) => move);
  const levelMoves = getMoves(learnings);
  const extraLevelMoves = getMoves(extraLearnings);

  const [r1, l1] = learn(request, "スーパーわざマシン",
                         move => levelMoves.includes(move));
  const [r2, l2] = learn(r1, "スーパーわざマシン(金銀)",
                         move => extraLevelMoves.includes(move));
  const [r3, l3] = learn(r2, desc,
                         move => tms.includes(move));
  const [r4, l4] = poke.name === "ドーブル" ?
        learn(r3, "スケッチ",
              move => !MoveData.cantSketch.includes(move)) :
        [r3, []];

  return l1.length + l2.length + l3.length + l4.length > 0 ?
    state.derive(poke, level, "わざマシン等", r4, l1.concat(l2, l3, l4)) :
    state;
}

class SearchFound {
  constructor(state) {
    this.state = state;
  }
}

function searchLearning(initState) {
  const track = new Array(256);
  const queue = [];

  function advances(s, t) {
    return s.level < t.level ||
      s.timeTraveled < t.timeTraveled ||
      s.timeTraveling < t.timeTraveling ||
      t.request.some(move => !s.request.includes(move));
  }
  const push = s0 => {
    const s = useTMs(s0);

    if (s.satisfied()) {
      throw new SearchFound(s);
    }

    const id = s.pokemon.id;
    if (track[id]) {
      if (track[id].every(s1 => advances(s, s1))) {
        track[id].push(s);
        queue.push(s);
      }
    }
    else {
      track[id] = [s];
      queue.push(s);
    }
  };
  push(initState);
  for (let counter = 0; queue.length; counter++) {
    if (counter > 10000) {
      throw new MessageException(`探索数 ${counter}`);
    }
    const state = queue.shift();
    const {pokemon: poke, level, request, learned, timeTraveling} = state;

    if (DistPokemon.poke[poke.id]) {
      for (const dist of DistPokemon.list) {
        if (poke.id === dist.poke && level >= dist.lv && request.every(m => dist.moves.includes(m))) {
          const [r, l] = learn(request, "配布初期技", _ => true);
          return state.derive(poke, level, "配布ポケモンを受け取る", r, l);
        }
      }
    }

    const evolvement = inspectEvolvement(poke);

    if (evolvement) {
      const beforeEvolvement = poke.evFromPoke();
      if (!(timeTraveling && !beforeEvolvement.isOld()) &&
          evolvement <= level) {
        const requiresLevelUp = evolvement > 1;

        if (requiresLevelUp) {
          // NB: このレベルアップで覚える技
          push(state.derive(beforeEvolvement, level - 1, "レベルアップ進化"));
        }
        else {
          push(state.derive(beforeEvolvement, level, "レベルまま進化"));
        }

      }
    }
    else if (!timeTraveling) {
      const egs = breedableEggGroups(poke);
      const ems = poke.eggMoves;

      const breed = (lms, desc) => {
        if (request.every(move => ems.includes(move) || lms.includes(move))) {
        const pokes = PokeData.raw.filter(
          poke => egs.some(
            eggGroup => poke.eggGroup.includes(eggGroup)));
        egs.forEach(eg => {
          pokes.forEach(partner => {
            if (maleExists(partner)) {
              push(state.derive(partner, 100, desc));
            }
          });
        });
      }
      };

      breed(poke.crystalLearnings.map(([, move]) => move), "タマゴ");
      if (poke.gsLearnings) {
        breed(poke.gsLearnings.map(([, move]) => move), "タマゴ(金銀)");
      }

    }

    if (timeTraveling) {
      push(state.derive(poke, level, "第二世代へ送る", request, [], false));
    }
    else if (poke.isOld() &&
             request.every(MoveData.isOld)) {
      push(state.derive(poke, level, "第一世代へ送る", request, [], true));
    }

  }
  return null;
}

function pokeCanLearnMovesCompatibly0(poke, lv, moves) {
  try {
    return searchLearning(new SearchState(poke, lv, "init", moves));
  }
  catch (e) {
    if (e instanceof SearchFound) {
      return e.state;
    }
    else {
      throw e;
    }
  }
}

function pokeCanLearnMovesCompatibly(page, pokes, moves, lv, types, eggGroups, order) {
  const sortFuncs = order && sortFunctions(order);
  const results = pokes.map(poke => [poke, pokeCanLearnMovesCompatibly0(poke, lv, moves.map(move => move.id))]).filter(r => r[1]);

  const ul = document.createElement("ul");
  (order ?
   (([key, compare]) => toSortedBy(results, ([p, ]) => key(p), compare))(sortFuncs) :
   results
  ).forEach(([poke, result]) => {
    if (result) {
      const link = makeTextLinkToPokidex(poke.name, page);
      if (order) {
        link.appendChild(document.createTextNode(`(${sortFuncs[0](poke)})`));
        link.className = "search-compat-result-link-sorted";
      }
      else {
        link.className = "search-compat-result-link";
      }
      const li = makeElement("li");

      const wrapper = makeElement("div", {"className": "search-compat-result-wrapper"});
      wrapper.appendChild(link);
      li.appendChild(wrapper);

      const list = makeElement("ol", {"className": "search-compat-result-state-nodes"});
      wrapper.appendChild(list);

      for (let r = result; r && r.description !== "init"; r = r.prev) {
        list.appendChild(makeElement("li",
                                     {"className": "search-compat-result-state-node"},
                                     `${r.pokemon.name}, ${r.description}, ${r.learned.map(([move, desc]) => `${MoveData.fromID(move).name}(${desc})` )}`));
      }

      ul.appendChild(li);
    }
  });

  page.appendChild(ul);
}

function iota(len, init = 0, step = 1) {
  const r = new Array(len);
  for (let i = 0; i < len; i++) {
    r[i] = init;
    init += step;
  }
  return r;
}

function intersperse(item, ary) {
  if (ary.length <= 1) {
    return ary;
  }
  else {
    const r = [ary[0]];
    for (let i = 1; i < ary.length; i++) {
      r.push(item);
      r.push(ary[i]);
    }
    return r;
  }
}

function search() {
  const pokidex = document.pokidex;
  const moves = iota(4, 1).map(i => pokidex["move" + i].value).map(name => MoveData.fromName(name)).filter(x => x);
  const lv = pokidex.lv.value || 100;
  const types = [pokidex.type1.value, pokidex.type2.value].filter(
    x => x
  ).map(x => parseInt(x));
  const eggGroups = [pokidex.egg1.value, pokidex.egg2.value].filter(
    x => x
  ).map(x => parseInt(x));
  const order = document.pokidex.sort.value;
  const pokes = (pokidex.poke1.value ? [PokeData.fromName(pokidex.poke1.value)] : PokeData.raw).filter(
    poke => types.every(
      type => type === poke.type1 || type === poke.type2
    )
  ).filter(
    poke => eggGroups.every(
      eggGroup => poke.eggGroup.includes(eggGroup)
    )
  );

  const [f, modeName] = {
    "and": [pokeCanLearnMovesProduct, "AND"],
    "compat": [pokeCanLearnMovesCompatibly, "両立"]
  }[document.pokidex.searchMode.value];

  function item(elm) {
    return makeElement("span", {"className": "search-item"}, elm);
  }
  withOutputResultArticle(modeName + "検索", page => {
    page.appendChild(makeElement("h3", {"className": "result-headline"},
                                 ...moves.length === 0 ?
                                 [] :
                                 ["レベル ",
                                  item(lv),
                                  " までに ",
                                  ...intersperse(" と ", moves.map(move => item(move.name))),
                                  " を覚える "],
                                 ...(types.length === 0 ?
                                     [] :
                                     [...intersperse("/", types.map(type => item(PokeData.type[type]))), " タイプ "]),
                                 ...(eggGroups.length === 0 ?
                                     [] :
                                     [...intersperse("/", eggGroups.map(egg => item(PokeData.eggGroup[egg]))), " タマゴグループ "]),
                                 (document.pokidex.poke1.value ?
                                  item(document.pokidex.poke1.value) :
                                  "ポケモン"),
                                 "の",
                                 item(modeName),
                                 "検索",
                                ...(order ?
                                    [`(ソート: ${document.pokidex.sort.selectedOptions[0].textContent})`] :
                                    [])));

    if (pokes.length === 0 && document.pokidex.poke1.value && (types.length || eggGroups.length)) {
      page.appendChild(makeElement("p", null, "# 種族と、タイプまたはタマゴグループが同時に指定されています"));
    }
    f(page, pokes, moves, lv, types, eggGroups, order);
  });
}



function parsePD(pd) {
  return pd.split("_x_").map(pokePD => {
    if (!/^(?:\d{1,3}_){2}(?:[0-9a-f]_){4}(?:\d{1,2}_){5}(?:\d{1,3}_){4}(?:\d{1,2}_){4}(?:[0-3]_){4}\d{1,3}_0?_\d{1,3}$/i.test(pokePD)) {
      throw new MessageException("wrong PD format: " + pokePD);
    }
    const a = pokePD.split("_");
    const poke = PokeData.fromID(a[0]);
    const lv = parseInt(a[1]);
    const moves = a.slice(11, 15).map(m => parseInt(m));

    return [poke, lv, moves];
  });
}

function checkPDMovesCompatibility(ev) {
  const pdStr = prompt("PD: ");
  if (pdStr) {
    const pd = parsePD(pdStr);

    withOutputResultArticle("チェック", page => {
      page.appendChild(makeElement("h3", {"className": "result-headline"},
                                   "両立チェック"));
      const ul = makeElement("ul");
      page.appendChild(ul);
      insertResult(page);

      pd.forEach(pokemon => {
        const [poke, lv, moves] = pokemon;
        const result = pokeCanLearnMovesCompatibly0(poke, lv, moves);

        ul.appendChild(makeElement("li", null,
                                   `${poke.name} ${moves.map(m => MoveData.fromID(m).name).join(" ")} `,
                                   result ?
                                   "可" :
                                   makeElement("strong", null, "不可")));

      });
    }, true);
  }
}



function scrollForward(ev) {
  const nodes = document.querySelector("#result").childNodes;
  window.scrollTo(0, Array.prototype.map.call(nodes, node => node.offsetTop).find(top => top > window.scrollY) || window.scrollMaxY);
}

function scrollBackward(ev) {
  const nodes = document.querySelector("#result").childNodes;
  window.scrollTo(0, Array.prototype.map.call(nodes, node => node.offsetTop).reverse().find(top => top < window.scrollY) || window.scrollMinY);
}

function scrollToBottom(ev) {
  window.scrollTo(0, window.scrollMaxY);
}

function scrollToTop(ev) {
  window.scrollTo(0, window.scrollMinY);
}

let setLevelValues = new Map([50, 51, 52, 53, 54, 55].map((v, i) => [String(i), v]));
setLevelValues.set("u", 100);
setLevelValues.set("l", 5);

function setLevel(ev) {
  const key = Key.stringifyEvent(ev);
  if (setLevelValues.has(key)) {
    document.pokidex.lv.value = setLevelValues.get(key);
  }
}

function withErrorHandler(f) {
  return function (...args) {
    try {
      return f.apply(null, args);
    }
    catch (er) {
      if (er instanceof MessageException) {
        message(er.message);
        return null;
      }
      else {
        messageHTML(`<pre>${er.message}\n${er.stack}</pre>`);
        throw er;
      }
    }
  };
}

function enterCommand(ev) {
  const target = ev.target;
  if (target.type === "button" || target.type === "checkbox") {
    target.click();
  }
  else {
    const actionTable = {
      "direct": _ => showPokidex(document.pokidex.poke.value),
      "search": search
    };
    const fieldset = Array.prototype.find.call(document.pokidex.querySelectorAll("fieldset"), fs => fs.contains(target));

    if (fieldset) {
      const action = actionTable[fieldset.name];
      if (action) {
        const run = () => {
          withErrorHandler(action)();
          message("");
          target.blur();
        };
        const source = inputDomainMap.get(ev.target);

        if (source) {
          if (source.exists(target.value)) {
            run();
          }
          else {
            const result = source.complete(target.value);

            if (result.value) {
              target.value = result.value;
            }
            if (result.finished && source.exists(target.value) ||
                fieldset.name === "direct" && PokeData.fromID(parseInt(target.value)) ||
                fieldset.name === "search" && target.value === "") {
              run();
            }
          }
        }
        else {
          run();
        }
      }
    }
  }
}

function showDistPokemons() {
  withOutputResultArticle("配布ポケモン一覧", page => {
    page.appendChild(makeElement("h3", {"className": "result-headline"},
                                 "配布ポケモン一覧"));

    const ul = makeElement("ul");

    DistPokemon.list.forEach(dist => {
      const {poke, lv, moves, shiny, old} = dist;
      const li = makeElement("li");
      const link = makeTextLinkToPokidex(PokeData.fromID(poke).name, page);

      li.appendChild(link);
      li.appendChild(document.createTextNode(` Lv ${lv} ${moves.map(m => MoveData.fromID(m).name).join(" ")} ${shiny ? "色違いが出やすい" : ""} ${old ? "初代" : ""}`));

      ul.appendChild(li);
    });

    page.appendChild(ul);
  }, true);
}

function prefixKeyHandler(evs) {
  message(Key.stringify(evs));
}
Keymap.prototype[Key.symbol.prefixKeyHandled] = prefixKeyHandler;

function commandMissingHandler(evs) {
  if (evs.length > 1) {
    message(`${Key.stringify(evs)} is undefined`);
  }
}
Keymap.prototype[Key.symbol.commandMissing] = commandMissingHandler;

const bodyKeymap = new Keymap("body");
const formKeymap = new Keymap("form");

bodyKeymap.define("f", new Command(scrollForward, {"document": "次の項目へスクロール", "direct": true}));
bodyKeymap.define("b", new Command(scrollBackward, {"document": "前の項目へスクロール", "direct": true}));
bodyKeymap.define("g", new Command(scrollToTop, {"document": "ページの先頭へスクロール", "direct": true}));
bodyKeymap.define("G", new Command(scrollToBottom, {"document": "ページの末尾へスクロール", "direct": true}));

const setLevelMap = bodyKeymap.makeSubKeymap("C-l", "set-level-map");
// prefixKeyHandled は bodyKeymap に対してしか呼ばれない
// setLevelMap[Key.symbol.prefixKeyHandled] = evs => {
//   message(setLevelValues.map((v, i) => `[${i}]${v}`).join(" "));
// };
{
  const setLevelCommand = new Command(setLevel, {"document": "レベルを入力"});
  for (const key of setLevelValues.keys()) {
    setLevelMap.define(key, setLevelCommand);
  }
  setLevelMap[Key.symbol.beforeCommand] = evs => {
    message("");
  };
}
{
  const enter = new Command(enterCommand, {"document": "フィールドセットに対応したアクションを実行"});
  formKeymap.define("Enter", enter);
  formKeymap.define("C-m", enter);
}

function makeTable(data) {
  const table = document.createElement("table");
  table.border = 1;
  data.forEach(line => {
    const row = table.insertRow(-1);
    line.forEach(function (value) {
      row.insertCell(-1).innerHTML = value;
    });
  });

  return table;
}

setLevelMap.document = `続くキーでレベルを入力: <code>${Array.from(setLevelValues.entries(), pair => `[${pair[0]}]${pair[1]}`).join(" ")}</code>`;
function describeKeybinds() {
  function extract(keymap) {
    return Array.from(keymap,
                      pair => [`<kbd>${pair[0]}</kbd>`, pair[1].document]);
  }
  const base = document.querySelector("#keybind-list");

  base.replaceChild(makeTable([["キー", "説明"]]
                              .concat(extract(bodyKeymap),
                                      extract(formKeymap))),
                    base.firstChild);
}

CompletionHandler.prototype.isCompletionEvent = function (ev) {
  return ev.key === " ";
};
CompletionHandler.prototype.show = function (result) {
  const ary = result.candidates;
  if (ary.length == 0) {
    message("[No match]");
  }
  else if (ary.length <= 99) {
    const p = document.createElement("p");
    p.innerHTML = ary.sort().join("<br />");
    const columnCount = ary.length < 30 ? Math.ceil(ary.length / 6) : "auto";
    p.style.columns = columnCount + " 10em";
    message(p);
  }
  else {
    message("[" + ary.length + " possibilities]");
  }
};
CompletionHandler.prototype.clear = _ => {
  message("");
};

function romaWithSuffix(str) {
  return new RegExp("^" + roma(str, true));
}

window.addEventListener("DOMContentLoaded", function (ev) {
  try {
    message("initializing...");
    document.title += " " + pokidexVersion;

    formKeymap.observe("keydown", document.pokidex);
    bodyKeymap.observe("keydown", document.body);

    const chPoke = new CompletionHandler(
      new CompletionSourceKeys(PokeData.index, romaWithSuffix));

    {
      const dform = document.pokidex.direct,
            show = withErrorHandler(_ => showPokidex(document.pokidex.poke.value));
      dform.appendChild(
        makeInputBox("input-direct",
                     makeInputText("poke", 5, "ポケモン", chPoke)));
      dform.appendChild(makeInputButton("button-show", "表示", show));
      chPoke.activate();
    }
    {
      const sform = document.pokidex.search,
            chEgg = new CompletionHandler(
              new CompletionSourceArray(PokeData.eggGroup, romaWithSuffix)),
            chMove = new CompletionHandler(
              new CompletionSourceKeys(MoveData.index, romaWithSuffix)),
            inputBoxes = makeDiv("input-boxes"),
            initSearchMode = () => {
              document.pokidex.searchMode.value = 'compat';
            };
      sform.appendChild(inputBoxes);
      inputBoxes.appendChild(
        makeInputBox("input-types",
                     makeInputNumber("lv", 3, 2, 100, 55),
                     makeSelectFromArray("type1", PokeData.type, "タイプ"),
                     makeSelectFromArray("type2", PokeData.type, "タイプ"),
                     makeSelectFromArray("egg1", PokeData.eggGroup, "タマゴグループ"),
                     makeSelectFromArray("egg2", PokeData.eggGroup, "タマゴグループ")));
      inputBoxes.appendChild(
        makeInputBox("input-moves",
                     makeInputText("poke1", 5, "ポケモン", chPoke),
                     makeInputText("move1", 7, "わざ", chMove),
                     makeInputText("move2", 7, "わざ", chMove),
                     makeInputText("move3", 7, "わざ", chMove),
                     makeInputText("move4", 7, "わざ", chMove)));
      inputBoxes.appendChild(
        makeInputBox("input-search-options",
                     ...makeRadioButtons("searchMode",
                                         ["両立検索", "compat"],
                                         ["AND検索", "and"])));
      initSearchMode();

      sform.appendChild(makeElement("div", null,
                                    makeInputButton("button-search", "検索", withErrorHandler(search)),
                                    makeSelectFromArray("sort", {
                                      "h>": "H>",
                                      "h<": "H<",
                                      "a>": "A>",
                                      "a<": "A<",
                                      "b>": "B>",
                                      "b<": "B<",
                                      "c>": "C>",
                                      "c<": "C<",
                                      "d>": "D>",
                                      "d<": "D<",
                                      "s>": "S>",
                                      "s<": "S<",
                                      "sum()>": "合計>",
                                      "sum()<": "合計<"
                                    }, "ソート"),
                                    makeInputButton("search-reset", "リセット", withErrorHandler(() => {
                                      if (confirm("入力をリセットしますか？")) {
                                        for (const e of document.pokidex.search.querySelectorAll('input[type="text"], input[type="number"], select')) {
                                          e.value = e.dataset.default ?? "";
                                        }
                                        initSearchMode();
                                        message("");
                                      }}))));

      chMove.activate();
    }

    {
      const oform = document.pokidex.others;

      oform.appendChild(
        makeInputBox("input-others",
                     makeInputButton("show-distpoke", "配布ポケモン一覧", withErrorHandler(showDistPokemons)),
                     makeInputButton("check-pd", "PD値から両立チェック", withErrorHandler(checkPDMovesCompatibility)),
                     makeInputButton("show-version", "バージョン情報", withErrorHandler(() => {
                       message(`POKiDEX ${pokidexVersion}, ${Key.os}, ${Key.browser} ${Key.browserVersion}`);
                     })),
                     makeCheckbox("help-checkbox", "ヘルプを表示")));
      document.pokidex["help-checkbox"].addEventListener("change", ev => {
        document.querySelector("#help-document").style.display = ev.target.checked ? "block" : "none";
      });

      describeKeybinds();
    }

    message("POKiDEX " + pokidexVersion);
  }
  catch (e) {
    console.log(e);
  }
});
