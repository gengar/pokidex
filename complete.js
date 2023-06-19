/*
 *   Copyright (C) 2013-2023, kaki
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

function regexpQuote(str) {
  return str.replace(/[\\^$*+?.()|[\]{}]/g, "\\$&");
}

/*
 * 情報源を表す抽象オブジェクト (抽象メソッド: enumerate)
 * 情報源と文字列から CompletionResult を生成
 * CompletionResult は候補一覧や確定部分を持つ
 */
class CompletionSource {
  constructor(source, converter) {
    this.source = source;
    this.converter = converter || null;
  }
  static kfalse(f) {
    return x => (f(x), false);
  }
  forEach(f) {
    this.enumerate(CompletionSource.kfalse(f));
  }
  find(f) {
    let result = null;
    this.enumerate(function (i) {
      if (f(i)) {
        result = i;
        return true;
      }
      else {
        return false;
      }
    });
    return result;
  }
  filter(f) {
    let ary = [];
    this.forEach(function (i) {
      if (f(i)) {
        ary.push(i);
      }
    });
    return ary;
  }
  exists(str) {
    return Boolean(this.find(s => s === str));
  }
  makeRegexp(str) {
    return this.converter ? this.converter(str) : new RegExp("^" + regexpQuote(str));
  }
  complete(str) {
    return new CompletionResult(str, this);
  }
}

class CompletionSourceArray extends CompletionSource {
  constructor(source, converter) {
    super(source, converter);
  }
  enumerate(f) {
    for (let i = 0; i < this.source.length; i++) {
      if (f(this.source[i])) {
        break;
      }
    }
  }
}
class CompletionSourceKeys extends CompletionSource {
  constructor(source, converter) {
    super(source, converter);
  }
  enumerate(f) {
    for (const i in this.source) {
      if (f(i)) {
        break;
      }
    }
  }
  exists(str) {
    return Boolean(this.source[str]);
  }
}

class CompletionSourceValues extends CompletionSource {
  constructor(source, converter) {
    super(source, converter);
  }
  enumerate(f) {
    for (const i of this.source) {
      if (f(i)) {
        break;
      }
    }
  }
}

function commonPrefix(ary) {
  return ary.reduce(function (s, t) {
    let len = s.length < t.length ? s.length : t.length;
    let i;
    for (i = 0; i < len && s[i] == t[i]; i++);
    return s.substring(0, i);
  });
}
/* 候補の一覧，共通prefix */
/*
 * 候補一覧の生成 -> common prefix -> 補完
 * source     :: CompletionSource
 * candidates :: Array
 *     全候補
 * finished   :: Boolean
 *     結果が一意に定まれば true
 * value      :: String || null
 *     補完結果文字列 or prefix or マッチなしを表すnull
 */

class CompletionResult {
  constructor(str, source) {
    this.source = source;
    this.origin = str;

    let reg = source.makeRegexp(str);
    this.candidates = source.filter(s => reg.test(s));
    let len = this.candidates.length;
    if (len == 0) {
      this.finished = false;
      this.value = null;
    }
    else if (len == 1) {
      this.finished = true;
      this.value = this.candidates[0];
    }
    else {
      this.finished = false;
      let prefix = commonPrefix(this.candidates);
      this.value = reg.test(prefix) ? prefix : null;
    }
  }
  exists() {
    return this.finished || this.source.exists(this.value);
  }
}

class CompletionHandler {
  constructor(src, active = false, targets = [], opts = {}) {
    this.targets = Array.from(targets);
    this.source = src;
    const options = ["show", "clear", "isCompletionDwimEvent", "isCompletionEvent"];
    for (const option of options) {
      const value = opts[option];
      if (value) {
        this[option] = value;
      }
    }
    this.active = active;
  }
  onInput(ev) {
    const target = ev.target;
    if (target.value) {
      this.show(this.source.complete(target.value), target, this.source);
    }
    else {
      this.clear();
    }
  }
  onKeydown(ev) {
    const target = ev.target;
    const value = target.value;
    if (this.isCompletionDwimEvent(ev)) {
      if (!(value === "" || this.source.exists(value))) {
        const result = this.source.complete(value);
        if (result.value) {
          target.value = result.value;
        }
        if (!result.finished) {
          ev.preventDefault();
          return;
        }
      }
      this.clear();
    }
    else if (this.isCompletionEvent(ev)) {
      const result = this.source.complete(value);
      if (result.value) {
        target.value = result.value;
      }
      this.show(result, target, this.source);
      ev.preventDefault();
    }
  }
  show(result, target, source) {}
  clear() {};
  isCompletionDwimEvent(ev) {
    return ev.key === "Tab";
  }
  isCompletionEvent(ev) {
    return false;
  }
  activate1(target) {
    target.addEventListener("keydown", this.onKeydown.bind(this));
    target.addEventListener("input", this.onInput.bind(this));
  }
  activate() {
    if (!this.active) {
      for (const target of this.targets) {
        this.activate1(target);
      }
      this.active = true;
    }
  }
  deactivate() {
    for (const target of this.targets) {
      target.deleteEventListener("keydown", this.onKeydown.bind(this));
      target.deleteEventListener("input", this.onInput.bind(this));
    }
    this.active = false;
  }
  add(target) {
    this.targets.push(target);
    if (this.active) {
      this.activate1(target);
    }
  }
}
