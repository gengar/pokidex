/*
 *   Copyright (C) 2020-2023, kaki
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

const Key = {
  os: ["Mac OS X", "Windows"].find(s => navigator.userAgent.indexOf(s) >= 0),
  browser: ["Firefox", "Edg", "Chrome", "Safari"].find(s => navigator.userAgent.indexOf(s) >= 0),
  AsyncFunction: (async () => {}).constructor,
  translationKeytable: {
    "¥": "\\"
  },
  isModifierKey(ev) {
    return /^(?:Alt|Control|Meta|Shift)$/.test(ev.key);
  },
  isToggleKey(ev) {
    return /Lock$/.test(ev.key);
  },
  isArrowKey(ev) {
    return /^Arrow/.test(ev.key);
  },
  isFunctionKey(ev) {
    return /^F[0-9]+$/.test(ev.key);
  },
  isSpecialKey(ev) {
    return Key.isArrowKey(ev) ||
      Key.isFunctionKey(ev) ||
      /^(?: | |Escape|Tab|Backspace|Delete|Enter|Lang[12]|Home|End|Page(?:Up|Down)|Insert|Pause)$/.test(ev.key);
  },
  isProcessKey(ev) {
    return ev.key === "Process";
  },
  guessAlnum(ev) {
    const code = ev.code;
    let ma;
    if ((ma = /^Key(.)$/.exec(code))) {
      return ev.shiftKey ? ma[1] : ma[1].toLowerCase();
    }
    else if ((ma = /^(?:Digit|Numpad)([0-9])$/.exec(code))) {
      return ma[1];
    }
    else {
      return null;
    }
  },
  guess(ev) {
    const code = ev.code;

    const key = Key.guessAlnum(ev);
    if (key != null) {
      return key;
    }
    else if (/^(?:LEFT|RIGHT)$/.test(ev.location)) {
      return ev.key;
    }
    else if (Key.isSpecialKey(ev)) {
      return code;
    }
    else {
      console.log("can't guess key:", ev);
      return "Unknown";
    }
  },
  needsToGuessForStringify(ev) {
    return false;
  },
  stringifyEvent(ev) {
    const key = Key.needsToGuessForStringify(ev) ?
          Key.guess(ev) :
          ev.key;
    return (ev.ctrlKey ? "C-" : "") +
      (ev.metaKey ? "M-" : "") +
      (ev.altKey ? "A-" : "") +
      ((ev.shiftKey && Key.isSpecialKey(ev)) ? "S-" : "") +
      (Key.translationKeytable[key] ??
       ((key === " " || key === "Enter") ? ev.code : key));
  },
  stringifyEventSequence(seq) {
    return seq.map(pair => Key.stringify(pair[0])).join(" ");
  },
  stringify(obj) {
    return obj instanceof EventSequence ?
      Key.stringifyEventSequence(obj) :
      obj instanceof Event ?
      Key.stringifyEvent(obj) :
      (() => {
        throw TypeError(`Event or EventSequence required, but got ${obj}`);
      })();
  },
  symbol: Object.create(null),
  defineSymbol(name) {
    Key.symbol[name] = Symbol("Key.symbol." + name);
  },
  parse(str) {
    const re = /((?:C-)?(?:M-)?(?:A-)?(?:S-)?(?:[A-Z][a-z]+|[^ ]))(?: |($))/gy;
    const result = [];
    let last;
    for (let ma; ma = re.exec(str);) {
      result.push(ma[1]);
      last = ma[2];
    }
    if (last !== "") {
      throw Error(`bad key string: "${str}"`);
    }
    return result;
  }
};

Key.browserVersion = new RegExp(`${Key.browser}/([0-9.]*)`).exec(navigator.userAgent)[1];

Key.defineSymbol("commandMissing");
Key.defineSymbol("prefixKeyHandled");
Key.defineSymbol("beforeCommand");

Object.seal(Key);

if (Key.os === "Mac OS X") {
  Key.needsToGuessForStringify = function (ev) {
    return ev.altKey;
  };
}

console.log("detected os:", Key.os, ", browser:", Key.browser);

class EventSequence extends Array {
  constructor(...args) {
    super(...args);
  }
  add(ev, keymap) {
    this.push([ev, keymap]);
  }
  get last() {
    if (this.length === 0) {
      throw Error("empty EventSequence");
    }
    else {
      return this[this.length - 1];
    }
  }
  get lastEvent() {
    return this.last[0];
  }
  get lastKeymap() {
    return this.last[1];
  }
}

function stopEvent(ev) {
  ev.stopImmediatePropagation();
  ev.preventDefault();
}

class KeymapObserver {
  constructor(keymap, type, target) {
    this.type = type;
    this.target = target;
    this.active = false;
    this.listener = this.dispatch.bind(this);
    this.rootMap = keymap;
    this.resetEventSequence();
  }
  resetEventSequence() {
    this.currentMap = this.rootMap;
    this.eventSequence = new EventSequence();
  }
  isActive() {
    return this.active;
  }
  activate() {
    if (this.active) {
      throw Error("already activated");
    }
    this.target.addEventListener(this.type, this.listener, false);
    this.active = true;
  }
  deactivate() {
    if (!this.active) {
      throw Error("does not activated");
    }
    this.target.removeEventListener(this.type, this.listener, false);
    this.active = false;
  }
  runKeymapHooks(type) {
    const seq = this.eventSequence;
    for (let i = seq.length; i--;) {
      let [_, keymap] = seq[i];
      let hook = keymap[type];
      if (hook && !hook(seq)) {
        // 偽値なら終了、真値なら伝播
        break;
      }
    }
  }
  dispatch(ev) {
    const miss = () => {
      try {
        if (keymap !== this.rootMap) {
          stopEvent(ev);
        }
        this.runKeymapHooks(Key.symbol.commandMissing);
      }
      finally {
        this.resetEventSequence();
      }
    };
    const keymap = this.currentMap;

    if (keymap.ignoresKey(ev)) {
      // console.log("ignore:", ev);
      return;
    }

    const key = Key.stringify(ev);
    const value = keymap.get(key);

    this.eventSequence.add(ev, keymap);
    // console.log("dispatch event:", ev, "as key:", key, "to:", value);
    if (!value) {
      miss();
    }
    else if (value instanceof KeymapEventListener) {
      if (value.direct && this.target !== this.eventSequence.lastEvent.target) {
        miss();
      }
      else {
        try {
          this.runKeymapHooks(Key.symbol.beforeCommand);
          value.run(this.eventSequence);
        }
        finally {
          this.resetEventSequence();
        }
      }
    }
    else if (value instanceof Keymap) {
      this.currentMap = value;
      stopEvent(ev);
      this.runKeymapHooks(Key.symbol.prefixKeyHandled);
    }
    else {
      throw TypeError(`wrong value in keymap: ${value}`);
    }
  }
}

class KeymapValue {}

class Keymap extends KeymapValue {
  constructor(name, parent) {
    super();
    this.name = name;
    this.parent = parent;
    this.table = new Map();
  }
  [Symbol.iterator]() {
    return this.table[Symbol.iterator]();
  }
  get(key) {
    return this.table.get(key) ?? (this.parent ? this.parent.get(key) : undefined);
  }
  add(key, value) {
    this.table.set(key, value);
  }
  define_keyseq(keyseq, value) {
    const [key, ...rest] = keyseq;
    if (rest.length === 0) {
      this.add(key, value);
    }
    else {
      let keymap = this.get(key);
      if (!(keymap instanceof Keymap)) {
        this.add(key, keymap = new this.constructor(key));
      }
      keymap.define_keyseq(rest, value);
    }
  }
  define(str, value) {
    if (value instanceof KeymapValue) {
      this.define_keyseq(Key.parse(str), value);
    }
    else if (typeof(value) === "function") {
      this.define(str, new Command(value));
    }
    else {
      throw TypeError(`wrong argument: ${value}`);
    }
  }
  undef(key) {
    this.table.delete(key);
  }
  defineKeys(obj) {
    for (const key in obj) {
      this.define(key, obj[key]);
    }
  }
  makeSubKeymap(key, name, parent) {
    const sub = new Keymap(name ?? key, parent);
    this.table.set(key, sub);
    return sub;
  }
  observe(type, target) {
    const observer = new KeymapObserver(this, type, target);
    observer.activate();
    return observer;
  }
  ignoresKey(ev) {
    return Key.isModifierKey(ev) || Key.isToggleKey(ev) || Key.isProcessKey(ev);
  }
  toString() {
    return `[Keymap ${this.name}]`;
  }
}

class KeymapEventListener extends KeymapValue {
  static camelCaseToKebabCase(name) {
    const re_str = "([A-Z]+(?:(?=[A-Z][a-z])|$)|[A-Z][a-z]*)";
    const re0 = RegExp("^" + re_str, "y");
    const re1 = RegExp(re_str, "g");
    const ma = re0.exec(name);
    const sub = s => s.replace(re1, "-$1");
    return (ma ?
            ma[1] + sub(name.substring(re0.lastIndex)) :
            sub(name)
           ).toLowerCase();
  }
  // option
  //   document: String
  //   argument: 'event-sequence' |'last-event'
  //   name: String
  //   direct: Boolean
  static acceptOptions = ["document", "argument", "name", "direct"];
  constructor(origFunc, options = {}) {
    super();
    for (const opt in options) {
      if (!this.constructor.acceptOptions.includes(opt)) {
        throw Error(`unknown option: ${opt}`);
      }
    }

    this.options = Object.freeze(options);
    this.name = (options.name != null) ? options.name :
      origFunc.name ? KeymapEventListener.camelCaseToKebabCase(origFunc.name) :
      (() => { throw new Error("anonymous function is invalid"); })();
    this.origFunc = origFunc;

    let func;

    switch (options.argument) {
    case "last-event":
    case undefined:
    case null:
      func = seq => origFunc(seq.lastEvent);
      break;
    case "event-sequence":
      func = origFunc;
      break;
    default:
      throw Error(`unknown value for option.argument: ${options.argument}`);
    }
    this.body = func;

    if (options.document != null) {
      this.document = options.document;
    }
    if (options.direct != null) {
      this.direct = options.direct;
    }
  }
  run(evs) {
    const body = this.body;
    return body(evs);
  }
  isAsync() {
    return this.origFunc instanceof Key.AsyncFunction;
  }
}

class Command extends KeymapEventListener {
  run(evs) {
    const ev = evs.lastEvent;
    stopEvent(ev);
    return super.run(evs);
  }
  exec(arg) {
    super.run(arg);
  }
}
