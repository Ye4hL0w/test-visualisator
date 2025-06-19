var noop = {value: () => {}};

function dispatch() {
  for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
    if (!(t = arguments[i] + "") || (t in _) || /[\s.]/.test(t)) throw new Error("illegal type: " + t);
    _[t] = [];
  }
  return new Dispatch(_);
}

function Dispatch(_) {
  this._ = _;
}

function parseTypenames$1(typenames, types) {
  return typenames.trim().split(/^|\s+/).map(function(t) {
    var name = "", i = t.indexOf(".");
    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
    if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
    return {type: t, name: name};
  });
}

Dispatch.prototype = dispatch.prototype = {
  constructor: Dispatch,
  on: function(typename, callback) {
    var _ = this._,
        T = parseTypenames$1(typename + "", _),
        t,
        i = -1,
        n = T.length;

    // If no callback was specified, return the callback of the given type and name.
    if (arguments.length < 2) {
      while (++i < n) if ((t = (typename = T[i]).type) && (t = get$1(_[t], typename.name))) return t;
      return;
    }

    // If a type was specified, set the callback for the given type and name.
    // Otherwise, if a null callback was specified, remove callbacks of the given name.
    if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
    while (++i < n) {
      if (t = (typename = T[i]).type) _[t] = set$1(_[t], typename.name, callback);
      else if (callback == null) for (t in _) _[t] = set$1(_[t], typename.name, null);
    }

    return this;
  },
  copy: function() {
    var copy = {}, _ = this._;
    for (var t in _) copy[t] = _[t].slice();
    return new Dispatch(copy);
  },
  call: function(type, that) {
    if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
    for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
  },
  apply: function(type, that, args) {
    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
    for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
  }
};

function get$1(type, name) {
  for (var i = 0, n = type.length, c; i < n; ++i) {
    if ((c = type[i]).name === name) {
      return c.value;
    }
  }
}

function set$1(type, name, callback) {
  for (var i = 0, n = type.length; i < n; ++i) {
    if (type[i].name === name) {
      type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
      break;
    }
  }
  if (callback != null) type.push({name: name, value: callback});
  return type;
}

var xhtml = "http://www.w3.org/1999/xhtml";

var namespaces = {
  svg: "http://www.w3.org/2000/svg",
  xhtml: xhtml,
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
  xmlns: "http://www.w3.org/2000/xmlns/"
};

function namespace(name) {
  var prefix = name += "", i = prefix.indexOf(":");
  if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
  return namespaces.hasOwnProperty(prefix) ? {space: namespaces[prefix], local: name} : name; // eslint-disable-line no-prototype-builtins
}

function creatorInherit(name) {
  return function() {
    var document = this.ownerDocument,
        uri = this.namespaceURI;
    return uri === xhtml && document.documentElement.namespaceURI === xhtml
        ? document.createElement(name)
        : document.createElementNS(uri, name);
  };
}

function creatorFixed(fullname) {
  return function() {
    return this.ownerDocument.createElementNS(fullname.space, fullname.local);
  };
}

function creator(name) {
  var fullname = namespace(name);
  return (fullname.local
      ? creatorFixed
      : creatorInherit)(fullname);
}

function none() {}

function selector(selector) {
  return selector == null ? none : function() {
    return this.querySelector(selector);
  };
}

function selection_select(select) {
  if (typeof select !== "function") select = selector(select);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
      if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
        if ("__data__" in node) subnode.__data__ = node.__data__;
        subgroup[i] = subnode;
      }
    }
  }

  return new Selection$1(subgroups, this._parents);
}

// Given something array like (or null), returns something that is strictly an
// array. This is used to ensure that array-like objects passed to d3.selectAll
// or selection.selectAll are converted into proper arrays when creating a
// selection; we don’t ever want to create a selection backed by a live
// HTMLCollection or NodeList. However, note that selection.selectAll will use a
// static NodeList as a group, since it safely derived from querySelectorAll.
function array(x) {
  return x == null ? [] : Array.isArray(x) ? x : Array.from(x);
}

function empty() {
  return [];
}

function selectorAll(selector) {
  return selector == null ? empty : function() {
    return this.querySelectorAll(selector);
  };
}

function arrayAll(select) {
  return function() {
    return array(select.apply(this, arguments));
  };
}

function selection_selectAll(select) {
  if (typeof select === "function") select = arrayAll(select);
  else select = selectorAll(select);

  for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        subgroups.push(select.call(node, node.__data__, i, group));
        parents.push(node);
      }
    }
  }

  return new Selection$1(subgroups, parents);
}

function matcher(selector) {
  return function() {
    return this.matches(selector);
  };
}

function childMatcher(selector) {
  return function(node) {
    return node.matches(selector);
  };
}

var find$1 = Array.prototype.find;

function childFind(match) {
  return function() {
    return find$1.call(this.children, match);
  };
}

function childFirst() {
  return this.firstElementChild;
}

function selection_selectChild(match) {
  return this.select(match == null ? childFirst
      : childFind(typeof match === "function" ? match : childMatcher(match)));
}

var filter = Array.prototype.filter;

function children() {
  return Array.from(this.children);
}

function childrenFilter(match) {
  return function() {
    return filter.call(this.children, match);
  };
}

function selection_selectChildren(match) {
  return this.selectAll(match == null ? children
      : childrenFilter(typeof match === "function" ? match : childMatcher(match)));
}

function selection_filter(match) {
  if (typeof match !== "function") match = matcher(match);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
        subgroup.push(node);
      }
    }
  }

  return new Selection$1(subgroups, this._parents);
}

function sparse(update) {
  return new Array(update.length);
}

function selection_enter() {
  return new Selection$1(this._enter || this._groups.map(sparse), this._parents);
}

function EnterNode(parent, datum) {
  this.ownerDocument = parent.ownerDocument;
  this.namespaceURI = parent.namespaceURI;
  this._next = null;
  this._parent = parent;
  this.__data__ = datum;
}

EnterNode.prototype = {
  constructor: EnterNode,
  appendChild: function(child) { return this._parent.insertBefore(child, this._next); },
  insertBefore: function(child, next) { return this._parent.insertBefore(child, next); },
  querySelector: function(selector) { return this._parent.querySelector(selector); },
  querySelectorAll: function(selector) { return this._parent.querySelectorAll(selector); }
};

function constant$3(x) {
  return function() {
    return x;
  };
}

function bindIndex(parent, group, enter, update, exit, data) {
  var i = 0,
      node,
      groupLength = group.length,
      dataLength = data.length;

  // Put any non-null nodes that fit into update.
  // Put any null nodes into enter.
  // Put any remaining data into enter.
  for (; i < dataLength; ++i) {
    if (node = group[i]) {
      node.__data__ = data[i];
      update[i] = node;
    } else {
      enter[i] = new EnterNode(parent, data[i]);
    }
  }

  // Put any non-null nodes that don’t fit into exit.
  for (; i < groupLength; ++i) {
    if (node = group[i]) {
      exit[i] = node;
    }
  }
}

function bindKey(parent, group, enter, update, exit, data, key) {
  var i,
      node,
      nodeByKeyValue = new Map,
      groupLength = group.length,
      dataLength = data.length,
      keyValues = new Array(groupLength),
      keyValue;

  // Compute the key for each node.
  // If multiple nodes have the same key, the duplicates are added to exit.
  for (i = 0; i < groupLength; ++i) {
    if (node = group[i]) {
      keyValues[i] = keyValue = key.call(node, node.__data__, i, group) + "";
      if (nodeByKeyValue.has(keyValue)) {
        exit[i] = node;
      } else {
        nodeByKeyValue.set(keyValue, node);
      }
    }
  }

  // Compute the key for each datum.
  // If there a node associated with this key, join and add it to update.
  // If there is not (or the key is a duplicate), add it to enter.
  for (i = 0; i < dataLength; ++i) {
    keyValue = key.call(parent, data[i], i, data) + "";
    if (node = nodeByKeyValue.get(keyValue)) {
      update[i] = node;
      node.__data__ = data[i];
      nodeByKeyValue.delete(keyValue);
    } else {
      enter[i] = new EnterNode(parent, data[i]);
    }
  }

  // Add any remaining nodes that were not bound to data to exit.
  for (i = 0; i < groupLength; ++i) {
    if ((node = group[i]) && (nodeByKeyValue.get(keyValues[i]) === node)) {
      exit[i] = node;
    }
  }
}

function datum(node) {
  return node.__data__;
}

function selection_data(value, key) {
  if (!arguments.length) return Array.from(this, datum);

  var bind = key ? bindKey : bindIndex,
      parents = this._parents,
      groups = this._groups;

  if (typeof value !== "function") value = constant$3(value);

  for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
    var parent = parents[j],
        group = groups[j],
        groupLength = group.length,
        data = arraylike(value.call(parent, parent && parent.__data__, j, parents)),
        dataLength = data.length,
        enterGroup = enter[j] = new Array(dataLength),
        updateGroup = update[j] = new Array(dataLength),
        exitGroup = exit[j] = new Array(groupLength);

    bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);

    // Now connect the enter nodes to their following update node, such that
    // appendChild can insert the materialized enter node before this node,
    // rather than at the end of the parent node.
    for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
      if (previous = enterGroup[i0]) {
        if (i0 >= i1) i1 = i0 + 1;
        while (!(next = updateGroup[i1]) && ++i1 < dataLength);
        previous._next = next || null;
      }
    }
  }

  update = new Selection$1(update, parents);
  update._enter = enter;
  update._exit = exit;
  return update;
}

// Given some data, this returns an array-like view of it: an object that
// exposes a length property and allows numeric indexing. Note that unlike
// selectAll, this isn’t worried about “live” collections because the resulting
// array will only be used briefly while data is being bound. (It is possible to
// cause the data to change while iterating by using a key function, but please
// don’t; we’d rather avoid a gratuitous copy.)
function arraylike(data) {
  return typeof data === "object" && "length" in data
    ? data // Array, TypedArray, NodeList, array-like
    : Array.from(data); // Map, Set, iterable, string, or anything else
}

function selection_exit() {
  return new Selection$1(this._exit || this._groups.map(sparse), this._parents);
}

function selection_join(onenter, onupdate, onexit) {
  var enter = this.enter(), update = this, exit = this.exit();
  if (typeof onenter === "function") {
    enter = onenter(enter);
    if (enter) enter = enter.selection();
  } else {
    enter = enter.append(onenter + "");
  }
  if (onupdate != null) {
    update = onupdate(update);
    if (update) update = update.selection();
  }
  if (onexit == null) exit.remove(); else onexit(exit);
  return enter && update ? enter.merge(update).order() : update;
}

function selection_merge(context) {
  var selection = context.selection ? context.selection() : context;

  for (var groups0 = this._groups, groups1 = selection._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
    for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group0[i] || group1[i]) {
        merge[i] = node;
      }
    }
  }

  for (; j < m0; ++j) {
    merges[j] = groups0[j];
  }

  return new Selection$1(merges, this._parents);
}

function selection_order() {

  for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) {
    for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
      if (node = group[i]) {
        if (next && node.compareDocumentPosition(next) ^ 4) next.parentNode.insertBefore(node, next);
        next = node;
      }
    }
  }

  return this;
}

function selection_sort(compare) {
  if (!compare) compare = ascending;

  function compareNode(a, b) {
    return a && b ? compare(a.__data__, b.__data__) : !a - !b;
  }

  for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        sortgroup[i] = node;
      }
    }
    sortgroup.sort(compareNode);
  }

  return new Selection$1(sortgroups, this._parents).order();
}

function ascending(a, b) {
  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}

function selection_call() {
  var callback = arguments[0];
  arguments[0] = this;
  callback.apply(null, arguments);
  return this;
}

function selection_nodes() {
  return Array.from(this);
}

function selection_node() {

  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
      var node = group[i];
      if (node) return node;
    }
  }

  return null;
}

function selection_size() {
  let size = 0;
  for (const node of this) ++size; // eslint-disable-line no-unused-vars
  return size;
}

function selection_empty() {
  return !this.node();
}

function selection_each(callback) {

  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
      if (node = group[i]) callback.call(node, node.__data__, i, group);
    }
  }

  return this;
}

function attrRemove$1(name) {
  return function() {
    this.removeAttribute(name);
  };
}

function attrRemoveNS$1(fullname) {
  return function() {
    this.removeAttributeNS(fullname.space, fullname.local);
  };
}

function attrConstant$1(name, value) {
  return function() {
    this.setAttribute(name, value);
  };
}

function attrConstantNS$1(fullname, value) {
  return function() {
    this.setAttributeNS(fullname.space, fullname.local, value);
  };
}

function attrFunction$1(name, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.removeAttribute(name);
    else this.setAttribute(name, v);
  };
}

function attrFunctionNS$1(fullname, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
    else this.setAttributeNS(fullname.space, fullname.local, v);
  };
}

function selection_attr(name, value) {
  var fullname = namespace(name);

  if (arguments.length < 2) {
    var node = this.node();
    return fullname.local
        ? node.getAttributeNS(fullname.space, fullname.local)
        : node.getAttribute(fullname);
  }

  return this.each((value == null
      ? (fullname.local ? attrRemoveNS$1 : attrRemove$1) : (typeof value === "function"
      ? (fullname.local ? attrFunctionNS$1 : attrFunction$1)
      : (fullname.local ? attrConstantNS$1 : attrConstant$1)))(fullname, value));
}

function defaultView(node) {
  return (node.ownerDocument && node.ownerDocument.defaultView) // node is a Node
      || (node.document && node) // node is a Window
      || node.defaultView; // node is a Document
}

function styleRemove$1(name) {
  return function() {
    this.style.removeProperty(name);
  };
}

function styleConstant$1(name, value, priority) {
  return function() {
    this.style.setProperty(name, value, priority);
  };
}

function styleFunction$1(name, value, priority) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.style.removeProperty(name);
    else this.style.setProperty(name, v, priority);
  };
}

function selection_style(name, value, priority) {
  return arguments.length > 1
      ? this.each((value == null
            ? styleRemove$1 : typeof value === "function"
            ? styleFunction$1
            : styleConstant$1)(name, value, priority == null ? "" : priority))
      : styleValue(this.node(), name);
}

function styleValue(node, name) {
  return node.style.getPropertyValue(name)
      || defaultView(node).getComputedStyle(node, null).getPropertyValue(name);
}

function propertyRemove(name) {
  return function() {
    delete this[name];
  };
}

function propertyConstant(name, value) {
  return function() {
    this[name] = value;
  };
}

function propertyFunction(name, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) delete this[name];
    else this[name] = v;
  };
}

function selection_property(name, value) {
  return arguments.length > 1
      ? this.each((value == null
          ? propertyRemove : typeof value === "function"
          ? propertyFunction
          : propertyConstant)(name, value))
      : this.node()[name];
}

function classArray(string) {
  return string.trim().split(/^|\s+/);
}

function classList(node) {
  return node.classList || new ClassList(node);
}

function ClassList(node) {
  this._node = node;
  this._names = classArray(node.getAttribute("class") || "");
}

ClassList.prototype = {
  add: function(name) {
    var i = this._names.indexOf(name);
    if (i < 0) {
      this._names.push(name);
      this._node.setAttribute("class", this._names.join(" "));
    }
  },
  remove: function(name) {
    var i = this._names.indexOf(name);
    if (i >= 0) {
      this._names.splice(i, 1);
      this._node.setAttribute("class", this._names.join(" "));
    }
  },
  contains: function(name) {
    return this._names.indexOf(name) >= 0;
  }
};

function classedAdd(node, names) {
  var list = classList(node), i = -1, n = names.length;
  while (++i < n) list.add(names[i]);
}

function classedRemove(node, names) {
  var list = classList(node), i = -1, n = names.length;
  while (++i < n) list.remove(names[i]);
}

function classedTrue(names) {
  return function() {
    classedAdd(this, names);
  };
}

function classedFalse(names) {
  return function() {
    classedRemove(this, names);
  };
}

function classedFunction(names, value) {
  return function() {
    (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
  };
}

function selection_classed(name, value) {
  var names = classArray(name + "");

  if (arguments.length < 2) {
    var list = classList(this.node()), i = -1, n = names.length;
    while (++i < n) if (!list.contains(names[i])) return false;
    return true;
  }

  return this.each((typeof value === "function"
      ? classedFunction : value
      ? classedTrue
      : classedFalse)(names, value));
}

function textRemove() {
  this.textContent = "";
}

function textConstant$1(value) {
  return function() {
    this.textContent = value;
  };
}

function textFunction$1(value) {
  return function() {
    var v = value.apply(this, arguments);
    this.textContent = v == null ? "" : v;
  };
}

function selection_text(value) {
  return arguments.length
      ? this.each(value == null
          ? textRemove : (typeof value === "function"
          ? textFunction$1
          : textConstant$1)(value))
      : this.node().textContent;
}

function htmlRemove() {
  this.innerHTML = "";
}

function htmlConstant(value) {
  return function() {
    this.innerHTML = value;
  };
}

function htmlFunction(value) {
  return function() {
    var v = value.apply(this, arguments);
    this.innerHTML = v == null ? "" : v;
  };
}

function selection_html(value) {
  return arguments.length
      ? this.each(value == null
          ? htmlRemove : (typeof value === "function"
          ? htmlFunction
          : htmlConstant)(value))
      : this.node().innerHTML;
}

function raise() {
  if (this.nextSibling) this.parentNode.appendChild(this);
}

function selection_raise() {
  return this.each(raise);
}

function lower() {
  if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
}

function selection_lower() {
  return this.each(lower);
}

function selection_append(name) {
  var create = typeof name === "function" ? name : creator(name);
  return this.select(function() {
    return this.appendChild(create.apply(this, arguments));
  });
}

function constantNull() {
  return null;
}

function selection_insert(name, before) {
  var create = typeof name === "function" ? name : creator(name),
      select = before == null ? constantNull : typeof before === "function" ? before : selector(before);
  return this.select(function() {
    return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
  });
}

function remove() {
  var parent = this.parentNode;
  if (parent) parent.removeChild(this);
}

function selection_remove() {
  return this.each(remove);
}

function selection_cloneShallow() {
  var clone = this.cloneNode(false), parent = this.parentNode;
  return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
}

function selection_cloneDeep() {
  var clone = this.cloneNode(true), parent = this.parentNode;
  return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
}

function selection_clone(deep) {
  return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
}

function selection_datum(value) {
  return arguments.length
      ? this.property("__data__", value)
      : this.node().__data__;
}

function contextListener(listener) {
  return function(event) {
    listener.call(this, event, this.__data__);
  };
}

function parseTypenames(typenames) {
  return typenames.trim().split(/^|\s+/).map(function(t) {
    var name = "", i = t.indexOf(".");
    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
    return {type: t, name: name};
  });
}

function onRemove(typename) {
  return function() {
    var on = this.__on;
    if (!on) return;
    for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
      if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
        this.removeEventListener(o.type, o.listener, o.options);
      } else {
        on[++i] = o;
      }
    }
    if (++i) on.length = i;
    else delete this.__on;
  };
}

function onAdd(typename, value, options) {
  return function() {
    var on = this.__on, o, listener = contextListener(value);
    if (on) for (var j = 0, m = on.length; j < m; ++j) {
      if ((o = on[j]).type === typename.type && o.name === typename.name) {
        this.removeEventListener(o.type, o.listener, o.options);
        this.addEventListener(o.type, o.listener = listener, o.options = options);
        o.value = value;
        return;
      }
    }
    this.addEventListener(typename.type, listener, options);
    o = {type: typename.type, name: typename.name, value: value, listener: listener, options: options};
    if (!on) this.__on = [o];
    else on.push(o);
  };
}

function selection_on(typename, value, options) {
  var typenames = parseTypenames(typename + ""), i, n = typenames.length, t;

  if (arguments.length < 2) {
    var on = this.node().__on;
    if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
      for (i = 0, o = on[j]; i < n; ++i) {
        if ((t = typenames[i]).type === o.type && t.name === o.name) {
          return o.value;
        }
      }
    }
    return;
  }

  on = value ? onAdd : onRemove;
  for (i = 0; i < n; ++i) this.each(on(typenames[i], value, options));
  return this;
}

function dispatchEvent(node, type, params) {
  var window = defaultView(node),
      event = window.CustomEvent;

  if (typeof event === "function") {
    event = new event(type, params);
  } else {
    event = window.document.createEvent("Event");
    if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
    else event.initEvent(type, false, false);
  }

  node.dispatchEvent(event);
}

function dispatchConstant(type, params) {
  return function() {
    return dispatchEvent(this, type, params);
  };
}

function dispatchFunction(type, params) {
  return function() {
    return dispatchEvent(this, type, params.apply(this, arguments));
  };
}

function selection_dispatch(type, params) {
  return this.each((typeof params === "function"
      ? dispatchFunction
      : dispatchConstant)(type, params));
}

function* selection_iterator() {
  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
      if (node = group[i]) yield node;
    }
  }
}

var root = [null];

function Selection$1(groups, parents) {
  this._groups = groups;
  this._parents = parents;
}

function selection() {
  return new Selection$1([[document.documentElement]], root);
}

function selection_selection() {
  return this;
}

Selection$1.prototype = selection.prototype = {
  constructor: Selection$1,
  select: selection_select,
  selectAll: selection_selectAll,
  selectChild: selection_selectChild,
  selectChildren: selection_selectChildren,
  filter: selection_filter,
  data: selection_data,
  enter: selection_enter,
  exit: selection_exit,
  join: selection_join,
  merge: selection_merge,
  selection: selection_selection,
  order: selection_order,
  sort: selection_sort,
  call: selection_call,
  nodes: selection_nodes,
  node: selection_node,
  size: selection_size,
  empty: selection_empty,
  each: selection_each,
  attr: selection_attr,
  style: selection_style,
  property: selection_property,
  classed: selection_classed,
  text: selection_text,
  html: selection_html,
  raise: selection_raise,
  lower: selection_lower,
  append: selection_append,
  insert: selection_insert,
  remove: selection_remove,
  clone: selection_clone,
  datum: selection_datum,
  on: selection_on,
  dispatch: selection_dispatch,
  [Symbol.iterator]: selection_iterator
};

function select(selector) {
  return typeof selector === "string"
      ? new Selection$1([[document.querySelector(selector)]], [document.documentElement])
      : new Selection$1([[selector]], root);
}

function sourceEvent(event) {
  let sourceEvent;
  while (sourceEvent = event.sourceEvent) event = sourceEvent;
  return event;
}

function pointer(event, node) {
  event = sourceEvent(event);
  if (node === undefined) node = event.currentTarget;
  if (node) {
    var svg = node.ownerSVGElement || node;
    if (svg.createSVGPoint) {
      var point = svg.createSVGPoint();
      point.x = event.clientX, point.y = event.clientY;
      point = point.matrixTransform(node.getScreenCTM().inverse());
      return [point.x, point.y];
    }
    if (node.getBoundingClientRect) {
      var rect = node.getBoundingClientRect();
      return [event.clientX - rect.left - node.clientLeft, event.clientY - rect.top - node.clientTop];
    }
  }
  return [event.pageX, event.pageY];
}

// These are typically used in conjunction with noevent to ensure that we can
// preventDefault on the event.
const nonpassive = {passive: false};
const nonpassivecapture = {capture: true, passive: false};

function nopropagation(event) {
  event.stopImmediatePropagation();
}

function noevent(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
}

function dragDisable(view) {
  var root = view.document.documentElement,
      selection = select(view).on("dragstart.drag", noevent, nonpassivecapture);
  if ("onselectstart" in root) {
    selection.on("selectstart.drag", noevent, nonpassivecapture);
  } else {
    root.__noselect = root.style.MozUserSelect;
    root.style.MozUserSelect = "none";
  }
}

function yesdrag(view, noclick) {
  var root = view.document.documentElement,
      selection = select(view).on("dragstart.drag", null);
  if (noclick) {
    selection.on("click.drag", noevent, nonpassivecapture);
    setTimeout(function() { selection.on("click.drag", null); }, 0);
  }
  if ("onselectstart" in root) {
    selection.on("selectstart.drag", null);
  } else {
    root.style.MozUserSelect = root.__noselect;
    delete root.__noselect;
  }
}

var constant$2 = x => () => x;

function DragEvent(type, {
  sourceEvent,
  subject,
  target,
  identifier,
  active,
  x, y, dx, dy,
  dispatch
}) {
  Object.defineProperties(this, {
    type: {value: type, enumerable: true, configurable: true},
    sourceEvent: {value: sourceEvent, enumerable: true, configurable: true},
    subject: {value: subject, enumerable: true, configurable: true},
    target: {value: target, enumerable: true, configurable: true},
    identifier: {value: identifier, enumerable: true, configurable: true},
    active: {value: active, enumerable: true, configurable: true},
    x: {value: x, enumerable: true, configurable: true},
    y: {value: y, enumerable: true, configurable: true},
    dx: {value: dx, enumerable: true, configurable: true},
    dy: {value: dy, enumerable: true, configurable: true},
    _: {value: dispatch}
  });
}

DragEvent.prototype.on = function() {
  var value = this._.on.apply(this._, arguments);
  return value === this._ ? this : value;
};

// Ignore right-click, since that should open the context menu.
function defaultFilter(event) {
  return !event.ctrlKey && !event.button;
}

function defaultContainer() {
  return this.parentNode;
}

function defaultSubject(event, d) {
  return d == null ? {x: event.x, y: event.y} : d;
}

function defaultTouchable() {
  return navigator.maxTouchPoints || ("ontouchstart" in this);
}

function drag() {
  var filter = defaultFilter,
      container = defaultContainer,
      subject = defaultSubject,
      touchable = defaultTouchable,
      gestures = {},
      listeners = dispatch("start", "drag", "end"),
      active = 0,
      mousedownx,
      mousedowny,
      mousemoving,
      touchending,
      clickDistance2 = 0;

  function drag(selection) {
    selection
        .on("mousedown.drag", mousedowned)
      .filter(touchable)
        .on("touchstart.drag", touchstarted)
        .on("touchmove.drag", touchmoved, nonpassive)
        .on("touchend.drag touchcancel.drag", touchended)
        .style("touch-action", "none")
        .style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
  }

  function mousedowned(event, d) {
    if (touchending || !filter.call(this, event, d)) return;
    var gesture = beforestart(this, container.call(this, event, d), event, d, "mouse");
    if (!gesture) return;
    select(event.view)
      .on("mousemove.drag", mousemoved, nonpassivecapture)
      .on("mouseup.drag", mouseupped, nonpassivecapture);
    dragDisable(event.view);
    nopropagation(event);
    mousemoving = false;
    mousedownx = event.clientX;
    mousedowny = event.clientY;
    gesture("start", event);
  }

  function mousemoved(event) {
    noevent(event);
    if (!mousemoving) {
      var dx = event.clientX - mousedownx, dy = event.clientY - mousedowny;
      mousemoving = dx * dx + dy * dy > clickDistance2;
    }
    gestures.mouse("drag", event);
  }

  function mouseupped(event) {
    select(event.view).on("mousemove.drag mouseup.drag", null);
    yesdrag(event.view, mousemoving);
    noevent(event);
    gestures.mouse("end", event);
  }

  function touchstarted(event, d) {
    if (!filter.call(this, event, d)) return;
    var touches = event.changedTouches,
        c = container.call(this, event, d),
        n = touches.length, i, gesture;

    for (i = 0; i < n; ++i) {
      if (gesture = beforestart(this, c, event, d, touches[i].identifier, touches[i])) {
        nopropagation(event);
        gesture("start", event, touches[i]);
      }
    }
  }

  function touchmoved(event) {
    var touches = event.changedTouches,
        n = touches.length, i, gesture;

    for (i = 0; i < n; ++i) {
      if (gesture = gestures[touches[i].identifier]) {
        noevent(event);
        gesture("drag", event, touches[i]);
      }
    }
  }

  function touchended(event) {
    var touches = event.changedTouches,
        n = touches.length, i, gesture;

    if (touchending) clearTimeout(touchending);
    touchending = setTimeout(function() { touchending = null; }, 500); // Ghost clicks are delayed!
    for (i = 0; i < n; ++i) {
      if (gesture = gestures[touches[i].identifier]) {
        nopropagation(event);
        gesture("end", event, touches[i]);
      }
    }
  }

  function beforestart(that, container, event, d, identifier, touch) {
    var dispatch = listeners.copy(),
        p = pointer(touch || event, container), dx, dy,
        s;

    if ((s = subject.call(that, new DragEvent("beforestart", {
        sourceEvent: event,
        target: drag,
        identifier,
        active,
        x: p[0],
        y: p[1],
        dx: 0,
        dy: 0,
        dispatch
      }), d)) == null) return;

    dx = s.x - p[0] || 0;
    dy = s.y - p[1] || 0;

    return function gesture(type, event, touch) {
      var p0 = p, n;
      switch (type) {
        case "start": gestures[identifier] = gesture, n = active++; break;
        case "end": delete gestures[identifier], --active; // falls through
        case "drag": p = pointer(touch || event, container), n = active; break;
      }
      dispatch.call(
        type,
        that,
        new DragEvent(type, {
          sourceEvent: event,
          subject: s,
          target: drag,
          identifier,
          active: n,
          x: p[0] + dx,
          y: p[1] + dy,
          dx: p[0] - p0[0],
          dy: p[1] - p0[1],
          dispatch
        }),
        d
      );
    };
  }

  drag.filter = function(_) {
    return arguments.length ? (filter = typeof _ === "function" ? _ : constant$2(!!_), drag) : filter;
  };

  drag.container = function(_) {
    return arguments.length ? (container = typeof _ === "function" ? _ : constant$2(_), drag) : container;
  };

  drag.subject = function(_) {
    return arguments.length ? (subject = typeof _ === "function" ? _ : constant$2(_), drag) : subject;
  };

  drag.touchable = function(_) {
    return arguments.length ? (touchable = typeof _ === "function" ? _ : constant$2(!!_), drag) : touchable;
  };

  drag.on = function() {
    var value = listeners.on.apply(listeners, arguments);
    return value === listeners ? drag : value;
  };

  drag.clickDistance = function(_) {
    return arguments.length ? (clickDistance2 = (_ = +_) * _, drag) : Math.sqrt(clickDistance2);
  };

  return drag;
}

function define(constructor, factory, prototype) {
  constructor.prototype = factory.prototype = prototype;
  prototype.constructor = constructor;
}

function extend(parent, definition) {
  var prototype = Object.create(parent.prototype);
  for (var key in definition) prototype[key] = definition[key];
  return prototype;
}

function Color() {}

var darker = 0.7;
var brighter = 1 / darker;

var reI = "\\s*([+-]?\\d+)\\s*",
    reN = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*",
    reP = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*",
    reHex = /^#([0-9a-f]{3,8})$/,
    reRgbInteger = new RegExp(`^rgb\\(${reI},${reI},${reI}\\)$`),
    reRgbPercent = new RegExp(`^rgb\\(${reP},${reP},${reP}\\)$`),
    reRgbaInteger = new RegExp(`^rgba\\(${reI},${reI},${reI},${reN}\\)$`),
    reRgbaPercent = new RegExp(`^rgba\\(${reP},${reP},${reP},${reN}\\)$`),
    reHslPercent = new RegExp(`^hsl\\(${reN},${reP},${reP}\\)$`),
    reHslaPercent = new RegExp(`^hsla\\(${reN},${reP},${reP},${reN}\\)$`);

var named = {
  aliceblue: 0xf0f8ff,
  antiquewhite: 0xfaebd7,
  aqua: 0x00ffff,
  aquamarine: 0x7fffd4,
  azure: 0xf0ffff,
  beige: 0xf5f5dc,
  bisque: 0xffe4c4,
  black: 0x000000,
  blanchedalmond: 0xffebcd,
  blue: 0x0000ff,
  blueviolet: 0x8a2be2,
  brown: 0xa52a2a,
  burlywood: 0xdeb887,
  cadetblue: 0x5f9ea0,
  chartreuse: 0x7fff00,
  chocolate: 0xd2691e,
  coral: 0xff7f50,
  cornflowerblue: 0x6495ed,
  cornsilk: 0xfff8dc,
  crimson: 0xdc143c,
  cyan: 0x00ffff,
  darkblue: 0x00008b,
  darkcyan: 0x008b8b,
  darkgoldenrod: 0xb8860b,
  darkgray: 0xa9a9a9,
  darkgreen: 0x006400,
  darkgrey: 0xa9a9a9,
  darkkhaki: 0xbdb76b,
  darkmagenta: 0x8b008b,
  darkolivegreen: 0x556b2f,
  darkorange: 0xff8c00,
  darkorchid: 0x9932cc,
  darkred: 0x8b0000,
  darksalmon: 0xe9967a,
  darkseagreen: 0x8fbc8f,
  darkslateblue: 0x483d8b,
  darkslategray: 0x2f4f4f,
  darkslategrey: 0x2f4f4f,
  darkturquoise: 0x00ced1,
  darkviolet: 0x9400d3,
  deeppink: 0xff1493,
  deepskyblue: 0x00bfff,
  dimgray: 0x696969,
  dimgrey: 0x696969,
  dodgerblue: 0x1e90ff,
  firebrick: 0xb22222,
  floralwhite: 0xfffaf0,
  forestgreen: 0x228b22,
  fuchsia: 0xff00ff,
  gainsboro: 0xdcdcdc,
  ghostwhite: 0xf8f8ff,
  gold: 0xffd700,
  goldenrod: 0xdaa520,
  gray: 0x808080,
  green: 0x008000,
  greenyellow: 0xadff2f,
  grey: 0x808080,
  honeydew: 0xf0fff0,
  hotpink: 0xff69b4,
  indianred: 0xcd5c5c,
  indigo: 0x4b0082,
  ivory: 0xfffff0,
  khaki: 0xf0e68c,
  lavender: 0xe6e6fa,
  lavenderblush: 0xfff0f5,
  lawngreen: 0x7cfc00,
  lemonchiffon: 0xfffacd,
  lightblue: 0xadd8e6,
  lightcoral: 0xf08080,
  lightcyan: 0xe0ffff,
  lightgoldenrodyellow: 0xfafad2,
  lightgray: 0xd3d3d3,
  lightgreen: 0x90ee90,
  lightgrey: 0xd3d3d3,
  lightpink: 0xffb6c1,
  lightsalmon: 0xffa07a,
  lightseagreen: 0x20b2aa,
  lightskyblue: 0x87cefa,
  lightslategray: 0x778899,
  lightslategrey: 0x778899,
  lightsteelblue: 0xb0c4de,
  lightyellow: 0xffffe0,
  lime: 0x00ff00,
  limegreen: 0x32cd32,
  linen: 0xfaf0e6,
  magenta: 0xff00ff,
  maroon: 0x800000,
  mediumaquamarine: 0x66cdaa,
  mediumblue: 0x0000cd,
  mediumorchid: 0xba55d3,
  mediumpurple: 0x9370db,
  mediumseagreen: 0x3cb371,
  mediumslateblue: 0x7b68ee,
  mediumspringgreen: 0x00fa9a,
  mediumturquoise: 0x48d1cc,
  mediumvioletred: 0xc71585,
  midnightblue: 0x191970,
  mintcream: 0xf5fffa,
  mistyrose: 0xffe4e1,
  moccasin: 0xffe4b5,
  navajowhite: 0xffdead,
  navy: 0x000080,
  oldlace: 0xfdf5e6,
  olive: 0x808000,
  olivedrab: 0x6b8e23,
  orange: 0xffa500,
  orangered: 0xff4500,
  orchid: 0xda70d6,
  palegoldenrod: 0xeee8aa,
  palegreen: 0x98fb98,
  paleturquoise: 0xafeeee,
  palevioletred: 0xdb7093,
  papayawhip: 0xffefd5,
  peachpuff: 0xffdab9,
  peru: 0xcd853f,
  pink: 0xffc0cb,
  plum: 0xdda0dd,
  powderblue: 0xb0e0e6,
  purple: 0x800080,
  rebeccapurple: 0x663399,
  red: 0xff0000,
  rosybrown: 0xbc8f8f,
  royalblue: 0x4169e1,
  saddlebrown: 0x8b4513,
  salmon: 0xfa8072,
  sandybrown: 0xf4a460,
  seagreen: 0x2e8b57,
  seashell: 0xfff5ee,
  sienna: 0xa0522d,
  silver: 0xc0c0c0,
  skyblue: 0x87ceeb,
  slateblue: 0x6a5acd,
  slategray: 0x708090,
  slategrey: 0x708090,
  snow: 0xfffafa,
  springgreen: 0x00ff7f,
  steelblue: 0x4682b4,
  tan: 0xd2b48c,
  teal: 0x008080,
  thistle: 0xd8bfd8,
  tomato: 0xff6347,
  turquoise: 0x40e0d0,
  violet: 0xee82ee,
  wheat: 0xf5deb3,
  white: 0xffffff,
  whitesmoke: 0xf5f5f5,
  yellow: 0xffff00,
  yellowgreen: 0x9acd32
};

define(Color, color, {
  copy(channels) {
    return Object.assign(new this.constructor, this, channels);
  },
  displayable() {
    return this.rgb().displayable();
  },
  hex: color_formatHex, // Deprecated! Use color.formatHex.
  formatHex: color_formatHex,
  formatHex8: color_formatHex8,
  formatHsl: color_formatHsl,
  formatRgb: color_formatRgb,
  toString: color_formatRgb
});

function color_formatHex() {
  return this.rgb().formatHex();
}

function color_formatHex8() {
  return this.rgb().formatHex8();
}

function color_formatHsl() {
  return hslConvert(this).formatHsl();
}

function color_formatRgb() {
  return this.rgb().formatRgb();
}

function color(format) {
  var m, l;
  format = (format + "").trim().toLowerCase();
  return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) // #ff0000
      : l === 3 ? new Rgb((m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf), 1) // #f00
      : l === 8 ? rgba(m >> 24 & 0xff, m >> 16 & 0xff, m >> 8 & 0xff, (m & 0xff) / 0xff) // #ff000000
      : l === 4 ? rgba((m >> 12 & 0xf) | (m >> 8 & 0xf0), (m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), (((m & 0xf) << 4) | (m & 0xf)) / 0xff) // #f000
      : null) // invalid hex
      : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
      : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
      : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
      : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
      : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
      : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
      : named.hasOwnProperty(format) ? rgbn(named[format]) // eslint-disable-line no-prototype-builtins
      : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0)
      : null;
}

function rgbn(n) {
  return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
}

function rgba(r, g, b, a) {
  if (a <= 0) r = g = b = NaN;
  return new Rgb(r, g, b, a);
}

function rgbConvert(o) {
  if (!(o instanceof Color)) o = color(o);
  if (!o) return new Rgb;
  o = o.rgb();
  return new Rgb(o.r, o.g, o.b, o.opacity);
}

function rgb(r, g, b, opacity) {
  return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
}

function Rgb(r, g, b, opacity) {
  this.r = +r;
  this.g = +g;
  this.b = +b;
  this.opacity = +opacity;
}

define(Rgb, rgb, extend(Color, {
  brighter(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
  },
  darker(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
  },
  rgb() {
    return this;
  },
  clamp() {
    return new Rgb(clampi(this.r), clampi(this.g), clampi(this.b), clampa(this.opacity));
  },
  displayable() {
    return (-0.5 <= this.r && this.r < 255.5)
        && (-0.5 <= this.g && this.g < 255.5)
        && (-0.5 <= this.b && this.b < 255.5)
        && (0 <= this.opacity && this.opacity <= 1);
  },
  hex: rgb_formatHex, // Deprecated! Use color.formatHex.
  formatHex: rgb_formatHex,
  formatHex8: rgb_formatHex8,
  formatRgb: rgb_formatRgb,
  toString: rgb_formatRgb
}));

function rgb_formatHex() {
  return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}`;
}

function rgb_formatHex8() {
  return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}${hex((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
}

function rgb_formatRgb() {
  const a = clampa(this.opacity);
  return `${a === 1 ? "rgb(" : "rgba("}${clampi(this.r)}, ${clampi(this.g)}, ${clampi(this.b)}${a === 1 ? ")" : `, ${a})`}`;
}

function clampa(opacity) {
  return isNaN(opacity) ? 1 : Math.max(0, Math.min(1, opacity));
}

function clampi(value) {
  return Math.max(0, Math.min(255, Math.round(value) || 0));
}

function hex(value) {
  value = clampi(value);
  return (value < 16 ? "0" : "") + value.toString(16);
}

function hsla(h, s, l, a) {
  if (a <= 0) h = s = l = NaN;
  else if (l <= 0 || l >= 1) h = s = NaN;
  else if (s <= 0) h = NaN;
  return new Hsl(h, s, l, a);
}

function hslConvert(o) {
  if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
  if (!(o instanceof Color)) o = color(o);
  if (!o) return new Hsl;
  if (o instanceof Hsl) return o;
  o = o.rgb();
  var r = o.r / 255,
      g = o.g / 255,
      b = o.b / 255,
      min = Math.min(r, g, b),
      max = Math.max(r, g, b),
      h = NaN,
      s = max - min,
      l = (max + min) / 2;
  if (s) {
    if (r === max) h = (g - b) / s + (g < b) * 6;
    else if (g === max) h = (b - r) / s + 2;
    else h = (r - g) / s + 4;
    s /= l < 0.5 ? max + min : 2 - max - min;
    h *= 60;
  } else {
    s = l > 0 && l < 1 ? 0 : h;
  }
  return new Hsl(h, s, l, o.opacity);
}

function hsl(h, s, l, opacity) {
  return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
}

function Hsl(h, s, l, opacity) {
  this.h = +h;
  this.s = +s;
  this.l = +l;
  this.opacity = +opacity;
}

define(Hsl, hsl, extend(Color, {
  brighter(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Hsl(this.h, this.s, this.l * k, this.opacity);
  },
  darker(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Hsl(this.h, this.s, this.l * k, this.opacity);
  },
  rgb() {
    var h = this.h % 360 + (this.h < 0) * 360,
        s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
        l = this.l,
        m2 = l + (l < 0.5 ? l : 1 - l) * s,
        m1 = 2 * l - m2;
    return new Rgb(
      hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
      hsl2rgb(h, m1, m2),
      hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
      this.opacity
    );
  },
  clamp() {
    return new Hsl(clamph(this.h), clampt(this.s), clampt(this.l), clampa(this.opacity));
  },
  displayable() {
    return (0 <= this.s && this.s <= 1 || isNaN(this.s))
        && (0 <= this.l && this.l <= 1)
        && (0 <= this.opacity && this.opacity <= 1);
  },
  formatHsl() {
    const a = clampa(this.opacity);
    return `${a === 1 ? "hsl(" : "hsla("}${clamph(this.h)}, ${clampt(this.s) * 100}%, ${clampt(this.l) * 100}%${a === 1 ? ")" : `, ${a})`}`;
  }
}));

function clamph(value) {
  value = (value || 0) % 360;
  return value < 0 ? value + 360 : value;
}

function clampt(value) {
  return Math.max(0, Math.min(1, value || 0));
}

/* From FvD 13.37, CSS Color Module Level 3 */
function hsl2rgb(h, m1, m2) {
  return (h < 60 ? m1 + (m2 - m1) * h / 60
      : h < 180 ? m2
      : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
      : m1) * 255;
}

var constant$1 = x => () => x;

function linear(a, d) {
  return function(t) {
    return a + t * d;
  };
}

function exponential(a, b, y) {
  return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
    return Math.pow(a + t * b, y);
  };
}

function gamma(y) {
  return (y = +y) === 1 ? nogamma : function(a, b) {
    return b - a ? exponential(a, b, y) : constant$1(isNaN(a) ? b : a);
  };
}

function nogamma(a, b) {
  var d = b - a;
  return d ? linear(a, d) : constant$1(isNaN(a) ? b : a);
}

var interpolateRgb = (function rgbGamma(y) {
  var color = gamma(y);

  function rgb$1(start, end) {
    var r = color((start = rgb(start)).r, (end = rgb(end)).r),
        g = color(start.g, end.g),
        b = color(start.b, end.b),
        opacity = nogamma(start.opacity, end.opacity);
    return function(t) {
      start.r = r(t);
      start.g = g(t);
      start.b = b(t);
      start.opacity = opacity(t);
      return start + "";
    };
  }

  rgb$1.gamma = rgbGamma;

  return rgb$1;
})(1);

function interpolateNumber(a, b) {
  return a = +a, b = +b, function(t) {
    return a * (1 - t) + b * t;
  };
}

var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,
    reB = new RegExp(reA.source, "g");

function zero(b) {
  return function() {
    return b;
  };
}

function one(b) {
  return function(t) {
    return b(t) + "";
  };
}

function interpolateString(a, b) {
  var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
      am, // current match in a
      bm, // current match in b
      bs, // string preceding current number in b, if any
      i = -1, // index in s
      s = [], // string constants and placeholders
      q = []; // number interpolators

  // Coerce inputs to strings.
  a = a + "", b = b + "";

  // Interpolate pairs of numbers in a & b.
  while ((am = reA.exec(a))
      && (bm = reB.exec(b))) {
    if ((bs = bm.index) > bi) { // a string precedes the next number in b
      bs = b.slice(bi, bs);
      if (s[i]) s[i] += bs; // coalesce with previous string
      else s[++i] = bs;
    }
    if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
      if (s[i]) s[i] += bm; // coalesce with previous string
      else s[++i] = bm;
    } else { // interpolate non-matching numbers
      s[++i] = null;
      q.push({i: i, x: interpolateNumber(am, bm)});
    }
    bi = reB.lastIndex;
  }

  // Add remains of b.
  if (bi < b.length) {
    bs = b.slice(bi);
    if (s[i]) s[i] += bs; // coalesce with previous string
    else s[++i] = bs;
  }

  // Special optimization for only a single match.
  // Otherwise, interpolate each of the numbers and rejoin the string.
  return s.length < 2 ? (q[0]
      ? one(q[0].x)
      : zero(b))
      : (b = q.length, function(t) {
          for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
          return s.join("");
        });
}

var degrees = 180 / Math.PI;

var identity = {
  translateX: 0,
  translateY: 0,
  rotate: 0,
  skewX: 0,
  scaleX: 1,
  scaleY: 1
};

function decompose(a, b, c, d, e, f) {
  var scaleX, scaleY, skewX;
  if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
  if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
  if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
  if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
  return {
    translateX: e,
    translateY: f,
    rotate: Math.atan2(b, a) * degrees,
    skewX: Math.atan(skewX) * degrees,
    scaleX: scaleX,
    scaleY: scaleY
  };
}

var svgNode;

/* eslint-disable no-undef */
function parseCss(value) {
  const m = new (typeof DOMMatrix === "function" ? DOMMatrix : WebKitCSSMatrix)(value + "");
  return m.isIdentity ? identity : decompose(m.a, m.b, m.c, m.d, m.e, m.f);
}

function parseSvg(value) {
  if (value == null) return identity;
  if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
  svgNode.setAttribute("transform", value);
  if (!(value = svgNode.transform.baseVal.consolidate())) return identity;
  value = value.matrix;
  return decompose(value.a, value.b, value.c, value.d, value.e, value.f);
}

function interpolateTransform(parse, pxComma, pxParen, degParen) {

  function pop(s) {
    return s.length ? s.pop() + " " : "";
  }

  function translate(xa, ya, xb, yb, s, q) {
    if (xa !== xb || ya !== yb) {
      var i = s.push("translate(", null, pxComma, null, pxParen);
      q.push({i: i - 4, x: interpolateNumber(xa, xb)}, {i: i - 2, x: interpolateNumber(ya, yb)});
    } else if (xb || yb) {
      s.push("translate(" + xb + pxComma + yb + pxParen);
    }
  }

  function rotate(a, b, s, q) {
    if (a !== b) {
      if (a - b > 180) b += 360; else if (b - a > 180) a += 360; // shortest path
      q.push({i: s.push(pop(s) + "rotate(", null, degParen) - 2, x: interpolateNumber(a, b)});
    } else if (b) {
      s.push(pop(s) + "rotate(" + b + degParen);
    }
  }

  function skewX(a, b, s, q) {
    if (a !== b) {
      q.push({i: s.push(pop(s) + "skewX(", null, degParen) - 2, x: interpolateNumber(a, b)});
    } else if (b) {
      s.push(pop(s) + "skewX(" + b + degParen);
    }
  }

  function scale(xa, ya, xb, yb, s, q) {
    if (xa !== xb || ya !== yb) {
      var i = s.push(pop(s) + "scale(", null, ",", null, ")");
      q.push({i: i - 4, x: interpolateNumber(xa, xb)}, {i: i - 2, x: interpolateNumber(ya, yb)});
    } else if (xb !== 1 || yb !== 1) {
      s.push(pop(s) + "scale(" + xb + "," + yb + ")");
    }
  }

  return function(a, b) {
    var s = [], // string constants and placeholders
        q = []; // number interpolators
    a = parse(a), b = parse(b);
    translate(a.translateX, a.translateY, b.translateX, b.translateY, s, q);
    rotate(a.rotate, b.rotate, s, q);
    skewX(a.skewX, b.skewX, s, q);
    scale(a.scaleX, a.scaleY, b.scaleX, b.scaleY, s, q);
    a = b = null; // gc
    return function(t) {
      var i = -1, n = q.length, o;
      while (++i < n) s[(o = q[i]).i] = o.x(t);
      return s.join("");
    };
  };
}

var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

var frame = 0, // is an animation frame pending?
    timeout$1 = 0, // is a timeout pending?
    interval = 0, // are any timers active?
    pokeDelay = 1000, // how frequently we check for clock skew
    taskHead,
    taskTail,
    clockLast = 0,
    clockNow = 0,
    clockSkew = 0,
    clock = typeof performance === "object" && performance.now ? performance : Date,
    setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) { setTimeout(f, 17); };

function now() {
  return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
}

function clearNow() {
  clockNow = 0;
}

function Timer() {
  this._call =
  this._time =
  this._next = null;
}

Timer.prototype = timer.prototype = {
  constructor: Timer,
  restart: function(callback, delay, time) {
    if (typeof callback !== "function") throw new TypeError("callback is not a function");
    time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
    if (!this._next && taskTail !== this) {
      if (taskTail) taskTail._next = this;
      else taskHead = this;
      taskTail = this;
    }
    this._call = callback;
    this._time = time;
    sleep();
  },
  stop: function() {
    if (this._call) {
      this._call = null;
      this._time = Infinity;
      sleep();
    }
  }
};

function timer(callback, delay, time) {
  var t = new Timer;
  t.restart(callback, delay, time);
  return t;
}

function timerFlush() {
  now(); // Get the current time, if not already set.
  ++frame; // Pretend we’ve set an alarm, if we haven’t already.
  var t = taskHead, e;
  while (t) {
    if ((e = clockNow - t._time) >= 0) t._call.call(undefined, e);
    t = t._next;
  }
  --frame;
}

function wake() {
  clockNow = (clockLast = clock.now()) + clockSkew;
  frame = timeout$1 = 0;
  try {
    timerFlush();
  } finally {
    frame = 0;
    nap();
    clockNow = 0;
  }
}

function poke() {
  var now = clock.now(), delay = now - clockLast;
  if (delay > pokeDelay) clockSkew -= delay, clockLast = now;
}

function nap() {
  var t0, t1 = taskHead, t2, time = Infinity;
  while (t1) {
    if (t1._call) {
      if (time > t1._time) time = t1._time;
      t0 = t1, t1 = t1._next;
    } else {
      t2 = t1._next, t1._next = null;
      t1 = t0 ? t0._next = t2 : taskHead = t2;
    }
  }
  taskTail = t0;
  sleep(time);
}

function sleep(time) {
  if (frame) return; // Soonest alarm already set, or will be.
  if (timeout$1) timeout$1 = clearTimeout(timeout$1);
  var delay = time - clockNow; // Strictly less than if we recomputed clockNow.
  if (delay > 24) {
    if (time < Infinity) timeout$1 = setTimeout(wake, time - clock.now() - clockSkew);
    if (interval) interval = clearInterval(interval);
  } else {
    if (!interval) clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
    frame = 1, setFrame(wake);
  }
}

function timeout(callback, delay, time) {
  var t = new Timer;
  delay = delay == null ? 0 : +delay;
  t.restart(elapsed => {
    t.stop();
    callback(elapsed + delay);
  }, delay, time);
  return t;
}

var emptyOn = dispatch("start", "end", "cancel", "interrupt");
var emptyTween = [];

var CREATED = 0;
var SCHEDULED = 1;
var STARTING = 2;
var STARTED = 3;
var RUNNING = 4;
var ENDING = 5;
var ENDED = 6;

function schedule(node, name, id, index, group, timing) {
  var schedules = node.__transition;
  if (!schedules) node.__transition = {};
  else if (id in schedules) return;
  create(node, id, {
    name: name,
    index: index, // For context during callback.
    group: group, // For context during callback.
    on: emptyOn,
    tween: emptyTween,
    time: timing.time,
    delay: timing.delay,
    duration: timing.duration,
    ease: timing.ease,
    timer: null,
    state: CREATED
  });
}

function init(node, id) {
  var schedule = get(node, id);
  if (schedule.state > CREATED) throw new Error("too late; already scheduled");
  return schedule;
}

function set(node, id) {
  var schedule = get(node, id);
  if (schedule.state > STARTED) throw new Error("too late; already running");
  return schedule;
}

function get(node, id) {
  var schedule = node.__transition;
  if (!schedule || !(schedule = schedule[id])) throw new Error("transition not found");
  return schedule;
}

function create(node, id, self) {
  var schedules = node.__transition,
      tween;

  // Initialize the self timer when the transition is created.
  // Note the actual delay is not known until the first callback!
  schedules[id] = self;
  self.timer = timer(schedule, 0, self.time);

  function schedule(elapsed) {
    self.state = SCHEDULED;
    self.timer.restart(start, self.delay, self.time);

    // If the elapsed delay is less than our first sleep, start immediately.
    if (self.delay <= elapsed) start(elapsed - self.delay);
  }

  function start(elapsed) {
    var i, j, n, o;

    // If the state is not SCHEDULED, then we previously errored on start.
    if (self.state !== SCHEDULED) return stop();

    for (i in schedules) {
      o = schedules[i];
      if (o.name !== self.name) continue;

      // While this element already has a starting transition during this frame,
      // defer starting an interrupting transition until that transition has a
      // chance to tick (and possibly end); see d3/d3-transition#54!
      if (o.state === STARTED) return timeout(start);

      // Interrupt the active transition, if any.
      if (o.state === RUNNING) {
        o.state = ENDED;
        o.timer.stop();
        o.on.call("interrupt", node, node.__data__, o.index, o.group);
        delete schedules[i];
      }

      // Cancel any pre-empted transitions.
      else if (+i < id) {
        o.state = ENDED;
        o.timer.stop();
        o.on.call("cancel", node, node.__data__, o.index, o.group);
        delete schedules[i];
      }
    }

    // Defer the first tick to end of the current frame; see d3/d3#1576.
    // Note the transition may be canceled after start and before the first tick!
    // Note this must be scheduled before the start event; see d3/d3-transition#16!
    // Assuming this is successful, subsequent callbacks go straight to tick.
    timeout(function() {
      if (self.state === STARTED) {
        self.state = RUNNING;
        self.timer.restart(tick, self.delay, self.time);
        tick(elapsed);
      }
    });

    // Dispatch the start event.
    // Note this must be done before the tween are initialized.
    self.state = STARTING;
    self.on.call("start", node, node.__data__, self.index, self.group);
    if (self.state !== STARTING) return; // interrupted
    self.state = STARTED;

    // Initialize the tween, deleting null tween.
    tween = new Array(n = self.tween.length);
    for (i = 0, j = -1; i < n; ++i) {
      if (o = self.tween[i].value.call(node, node.__data__, self.index, self.group)) {
        tween[++j] = o;
      }
    }
    tween.length = j + 1;
  }

  function tick(elapsed) {
    var t = elapsed < self.duration ? self.ease.call(null, elapsed / self.duration) : (self.timer.restart(stop), self.state = ENDING, 1),
        i = -1,
        n = tween.length;

    while (++i < n) {
      tween[i].call(node, t);
    }

    // Dispatch the end event.
    if (self.state === ENDING) {
      self.on.call("end", node, node.__data__, self.index, self.group);
      stop();
    }
  }

  function stop() {
    self.state = ENDED;
    self.timer.stop();
    delete schedules[id];
    for (var i in schedules) return; // eslint-disable-line no-unused-vars
    delete node.__transition;
  }
}

function interrupt(node, name) {
  var schedules = node.__transition,
      schedule,
      active,
      empty = true,
      i;

  if (!schedules) return;

  name = name == null ? null : name + "";

  for (i in schedules) {
    if ((schedule = schedules[i]).name !== name) { empty = false; continue; }
    active = schedule.state > STARTING && schedule.state < ENDING;
    schedule.state = ENDED;
    schedule.timer.stop();
    schedule.on.call(active ? "interrupt" : "cancel", node, node.__data__, schedule.index, schedule.group);
    delete schedules[i];
  }

  if (empty) delete node.__transition;
}

function selection_interrupt(name) {
  return this.each(function() {
    interrupt(this, name);
  });
}

function tweenRemove(id, name) {
  var tween0, tween1;
  return function() {
    var schedule = set(this, id),
        tween = schedule.tween;

    // If this node shared tween with the previous node,
    // just assign the updated shared tween and we’re done!
    // Otherwise, copy-on-write.
    if (tween !== tween0) {
      tween1 = tween0 = tween;
      for (var i = 0, n = tween1.length; i < n; ++i) {
        if (tween1[i].name === name) {
          tween1 = tween1.slice();
          tween1.splice(i, 1);
          break;
        }
      }
    }

    schedule.tween = tween1;
  };
}

function tweenFunction(id, name, value) {
  var tween0, tween1;
  if (typeof value !== "function") throw new Error;
  return function() {
    var schedule = set(this, id),
        tween = schedule.tween;

    // If this node shared tween with the previous node,
    // just assign the updated shared tween and we’re done!
    // Otherwise, copy-on-write.
    if (tween !== tween0) {
      tween1 = (tween0 = tween).slice();
      for (var t = {name: name, value: value}, i = 0, n = tween1.length; i < n; ++i) {
        if (tween1[i].name === name) {
          tween1[i] = t;
          break;
        }
      }
      if (i === n) tween1.push(t);
    }

    schedule.tween = tween1;
  };
}

function transition_tween(name, value) {
  var id = this._id;

  name += "";

  if (arguments.length < 2) {
    var tween = get(this.node(), id).tween;
    for (var i = 0, n = tween.length, t; i < n; ++i) {
      if ((t = tween[i]).name === name) {
        return t.value;
      }
    }
    return null;
  }

  return this.each((value == null ? tweenRemove : tweenFunction)(id, name, value));
}

function tweenValue(transition, name, value) {
  var id = transition._id;

  transition.each(function() {
    var schedule = set(this, id);
    (schedule.value || (schedule.value = {}))[name] = value.apply(this, arguments);
  });

  return function(node) {
    return get(node, id).value[name];
  };
}

function interpolate(a, b) {
  var c;
  return (typeof b === "number" ? interpolateNumber
      : b instanceof color ? interpolateRgb
      : (c = color(b)) ? (b = c, interpolateRgb)
      : interpolateString)(a, b);
}

function attrRemove(name) {
  return function() {
    this.removeAttribute(name);
  };
}

function attrRemoveNS(fullname) {
  return function() {
    this.removeAttributeNS(fullname.space, fullname.local);
  };
}

function attrConstant(name, interpolate, value1) {
  var string00,
      string1 = value1 + "",
      interpolate0;
  return function() {
    var string0 = this.getAttribute(name);
    return string0 === string1 ? null
        : string0 === string00 ? interpolate0
        : interpolate0 = interpolate(string00 = string0, value1);
  };
}

function attrConstantNS(fullname, interpolate, value1) {
  var string00,
      string1 = value1 + "",
      interpolate0;
  return function() {
    var string0 = this.getAttributeNS(fullname.space, fullname.local);
    return string0 === string1 ? null
        : string0 === string00 ? interpolate0
        : interpolate0 = interpolate(string00 = string0, value1);
  };
}

function attrFunction(name, interpolate, value) {
  var string00,
      string10,
      interpolate0;
  return function() {
    var string0, value1 = value(this), string1;
    if (value1 == null) return void this.removeAttribute(name);
    string0 = this.getAttribute(name);
    string1 = value1 + "";
    return string0 === string1 ? null
        : string0 === string00 && string1 === string10 ? interpolate0
        : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
  };
}

function attrFunctionNS(fullname, interpolate, value) {
  var string00,
      string10,
      interpolate0;
  return function() {
    var string0, value1 = value(this), string1;
    if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
    string0 = this.getAttributeNS(fullname.space, fullname.local);
    string1 = value1 + "";
    return string0 === string1 ? null
        : string0 === string00 && string1 === string10 ? interpolate0
        : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
  };
}

function transition_attr(name, value) {
  var fullname = namespace(name), i = fullname === "transform" ? interpolateTransformSvg : interpolate;
  return this.attrTween(name, typeof value === "function"
      ? (fullname.local ? attrFunctionNS : attrFunction)(fullname, i, tweenValue(this, "attr." + name, value))
      : value == null ? (fullname.local ? attrRemoveNS : attrRemove)(fullname)
      : (fullname.local ? attrConstantNS : attrConstant)(fullname, i, value));
}

function attrInterpolate(name, i) {
  return function(t) {
    this.setAttribute(name, i.call(this, t));
  };
}

function attrInterpolateNS(fullname, i) {
  return function(t) {
    this.setAttributeNS(fullname.space, fullname.local, i.call(this, t));
  };
}

function attrTweenNS(fullname, value) {
  var t0, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t0 = (i0 = i) && attrInterpolateNS(fullname, i);
    return t0;
  }
  tween._value = value;
  return tween;
}

function attrTween(name, value) {
  var t0, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t0 = (i0 = i) && attrInterpolate(name, i);
    return t0;
  }
  tween._value = value;
  return tween;
}

function transition_attrTween(name, value) {
  var key = "attr." + name;
  if (arguments.length < 2) return (key = this.tween(key)) && key._value;
  if (value == null) return this.tween(key, null);
  if (typeof value !== "function") throw new Error;
  var fullname = namespace(name);
  return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
}

function delayFunction(id, value) {
  return function() {
    init(this, id).delay = +value.apply(this, arguments);
  };
}

function delayConstant(id, value) {
  return value = +value, function() {
    init(this, id).delay = value;
  };
}

function transition_delay(value) {
  var id = this._id;

  return arguments.length
      ? this.each((typeof value === "function"
          ? delayFunction
          : delayConstant)(id, value))
      : get(this.node(), id).delay;
}

function durationFunction(id, value) {
  return function() {
    set(this, id).duration = +value.apply(this, arguments);
  };
}

function durationConstant(id, value) {
  return value = +value, function() {
    set(this, id).duration = value;
  };
}

function transition_duration(value) {
  var id = this._id;

  return arguments.length
      ? this.each((typeof value === "function"
          ? durationFunction
          : durationConstant)(id, value))
      : get(this.node(), id).duration;
}

function easeConstant(id, value) {
  if (typeof value !== "function") throw new Error;
  return function() {
    set(this, id).ease = value;
  };
}

function transition_ease(value) {
  var id = this._id;

  return arguments.length
      ? this.each(easeConstant(id, value))
      : get(this.node(), id).ease;
}

function easeVarying(id, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (typeof v !== "function") throw new Error;
    set(this, id).ease = v;
  };
}

function transition_easeVarying(value) {
  if (typeof value !== "function") throw new Error;
  return this.each(easeVarying(this._id, value));
}

function transition_filter(match) {
  if (typeof match !== "function") match = matcher(match);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
        subgroup.push(node);
      }
    }
  }

  return new Transition(subgroups, this._parents, this._name, this._id);
}

function transition_merge(transition) {
  if (transition._id !== this._id) throw new Error;

  for (var groups0 = this._groups, groups1 = transition._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
    for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group0[i] || group1[i]) {
        merge[i] = node;
      }
    }
  }

  for (; j < m0; ++j) {
    merges[j] = groups0[j];
  }

  return new Transition(merges, this._parents, this._name, this._id);
}

function start(name) {
  return (name + "").trim().split(/^|\s+/).every(function(t) {
    var i = t.indexOf(".");
    if (i >= 0) t = t.slice(0, i);
    return !t || t === "start";
  });
}

function onFunction(id, name, listener) {
  var on0, on1, sit = start(name) ? init : set;
  return function() {
    var schedule = sit(this, id),
        on = schedule.on;

    // If this node shared a dispatch with the previous node,
    // just assign the updated shared dispatch and we’re done!
    // Otherwise, copy-on-write.
    if (on !== on0) (on1 = (on0 = on).copy()).on(name, listener);

    schedule.on = on1;
  };
}

function transition_on(name, listener) {
  var id = this._id;

  return arguments.length < 2
      ? get(this.node(), id).on.on(name)
      : this.each(onFunction(id, name, listener));
}

function removeFunction(id) {
  return function() {
    var parent = this.parentNode;
    for (var i in this.__transition) if (+i !== id) return;
    if (parent) parent.removeChild(this);
  };
}

function transition_remove() {
  return this.on("end.remove", removeFunction(this._id));
}

function transition_select(select) {
  var name = this._name,
      id = this._id;

  if (typeof select !== "function") select = selector(select);

  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
      if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
        if ("__data__" in node) subnode.__data__ = node.__data__;
        subgroup[i] = subnode;
        schedule(subgroup[i], name, id, i, subgroup, get(node, id));
      }
    }
  }

  return new Transition(subgroups, this._parents, name, id);
}

function transition_selectAll(select) {
  var name = this._name,
      id = this._id;

  if (typeof select !== "function") select = selectorAll(select);

  for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        for (var children = select.call(node, node.__data__, i, group), child, inherit = get(node, id), k = 0, l = children.length; k < l; ++k) {
          if (child = children[k]) {
            schedule(child, name, id, k, children, inherit);
          }
        }
        subgroups.push(children);
        parents.push(node);
      }
    }
  }

  return new Transition(subgroups, parents, name, id);
}

var Selection = selection.prototype.constructor;

function transition_selection() {
  return new Selection(this._groups, this._parents);
}

function styleNull(name, interpolate) {
  var string00,
      string10,
      interpolate0;
  return function() {
    var string0 = styleValue(this, name),
        string1 = (this.style.removeProperty(name), styleValue(this, name));
    return string0 === string1 ? null
        : string0 === string00 && string1 === string10 ? interpolate0
        : interpolate0 = interpolate(string00 = string0, string10 = string1);
  };
}

function styleRemove(name) {
  return function() {
    this.style.removeProperty(name);
  };
}

function styleConstant(name, interpolate, value1) {
  var string00,
      string1 = value1 + "",
      interpolate0;
  return function() {
    var string0 = styleValue(this, name);
    return string0 === string1 ? null
        : string0 === string00 ? interpolate0
        : interpolate0 = interpolate(string00 = string0, value1);
  };
}

function styleFunction(name, interpolate, value) {
  var string00,
      string10,
      interpolate0;
  return function() {
    var string0 = styleValue(this, name),
        value1 = value(this),
        string1 = value1 + "";
    if (value1 == null) string1 = value1 = (this.style.removeProperty(name), styleValue(this, name));
    return string0 === string1 ? null
        : string0 === string00 && string1 === string10 ? interpolate0
        : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
  };
}

function styleMaybeRemove(id, name) {
  var on0, on1, listener0, key = "style." + name, event = "end." + key, remove;
  return function() {
    var schedule = set(this, id),
        on = schedule.on,
        listener = schedule.value[key] == null ? remove || (remove = styleRemove(name)) : undefined;

    // If this node shared a dispatch with the previous node,
    // just assign the updated shared dispatch and we’re done!
    // Otherwise, copy-on-write.
    if (on !== on0 || listener0 !== listener) (on1 = (on0 = on).copy()).on(event, listener0 = listener);

    schedule.on = on1;
  };
}

function transition_style(name, value, priority) {
  var i = (name += "") === "transform" ? interpolateTransformCss : interpolate;
  return value == null ? this
      .styleTween(name, styleNull(name, i))
      .on("end.style." + name, styleRemove(name))
    : typeof value === "function" ? this
      .styleTween(name, styleFunction(name, i, tweenValue(this, "style." + name, value)))
      .each(styleMaybeRemove(this._id, name))
    : this
      .styleTween(name, styleConstant(name, i, value), priority)
      .on("end.style." + name, null);
}

function styleInterpolate(name, i, priority) {
  return function(t) {
    this.style.setProperty(name, i.call(this, t), priority);
  };
}

function styleTween(name, value, priority) {
  var t, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t = (i0 = i) && styleInterpolate(name, i, priority);
    return t;
  }
  tween._value = value;
  return tween;
}

function transition_styleTween(name, value, priority) {
  var key = "style." + (name += "");
  if (arguments.length < 2) return (key = this.tween(key)) && key._value;
  if (value == null) return this.tween(key, null);
  if (typeof value !== "function") throw new Error;
  return this.tween(key, styleTween(name, value, priority == null ? "" : priority));
}

function textConstant(value) {
  return function() {
    this.textContent = value;
  };
}

function textFunction(value) {
  return function() {
    var value1 = value(this);
    this.textContent = value1 == null ? "" : value1;
  };
}

function transition_text(value) {
  return this.tween("text", typeof value === "function"
      ? textFunction(tweenValue(this, "text", value))
      : textConstant(value == null ? "" : value + ""));
}

function textInterpolate(i) {
  return function(t) {
    this.textContent = i.call(this, t);
  };
}

function textTween(value) {
  var t0, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t0 = (i0 = i) && textInterpolate(i);
    return t0;
  }
  tween._value = value;
  return tween;
}

function transition_textTween(value) {
  var key = "text";
  if (arguments.length < 1) return (key = this.tween(key)) && key._value;
  if (value == null) return this.tween(key, null);
  if (typeof value !== "function") throw new Error;
  return this.tween(key, textTween(value));
}

function transition_transition() {
  var name = this._name,
      id0 = this._id,
      id1 = newId();

  for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        var inherit = get(node, id0);
        schedule(node, name, id1, i, group, {
          time: inherit.time + inherit.delay + inherit.duration,
          delay: 0,
          duration: inherit.duration,
          ease: inherit.ease
        });
      }
    }
  }

  return new Transition(groups, this._parents, name, id1);
}

function transition_end() {
  var on0, on1, that = this, id = that._id, size = that.size();
  return new Promise(function(resolve, reject) {
    var cancel = {value: reject},
        end = {value: function() { if (--size === 0) resolve(); }};

    that.each(function() {
      var schedule = set(this, id),
          on = schedule.on;

      // If this node shared a dispatch with the previous node,
      // just assign the updated shared dispatch and we’re done!
      // Otherwise, copy-on-write.
      if (on !== on0) {
        on1 = (on0 = on).copy();
        on1._.cancel.push(cancel);
        on1._.interrupt.push(cancel);
        on1._.end.push(end);
      }

      schedule.on = on1;
    });

    // The selection was empty, resolve end immediately
    if (size === 0) resolve();
  });
}

var id = 0;

function Transition(groups, parents, name, id) {
  this._groups = groups;
  this._parents = parents;
  this._name = name;
  this._id = id;
}

function newId() {
  return ++id;
}

var selection_prototype = selection.prototype;

Transition.prototype = {
  constructor: Transition,
  select: transition_select,
  selectAll: transition_selectAll,
  selectChild: selection_prototype.selectChild,
  selectChildren: selection_prototype.selectChildren,
  filter: transition_filter,
  merge: transition_merge,
  selection: transition_selection,
  transition: transition_transition,
  call: selection_prototype.call,
  nodes: selection_prototype.nodes,
  node: selection_prototype.node,
  size: selection_prototype.size,
  empty: selection_prototype.empty,
  each: selection_prototype.each,
  on: transition_on,
  attr: transition_attr,
  attrTween: transition_attrTween,
  style: transition_style,
  styleTween: transition_styleTween,
  text: transition_text,
  textTween: transition_textTween,
  remove: transition_remove,
  tween: transition_tween,
  delay: transition_delay,
  duration: transition_duration,
  ease: transition_ease,
  easeVarying: transition_easeVarying,
  end: transition_end,
  [Symbol.iterator]: selection_prototype[Symbol.iterator]
};

function cubicInOut(t) {
  return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
}

var defaultTiming = {
  time: null, // Set on use.
  delay: 0,
  duration: 250,
  ease: cubicInOut
};

function inherit(node, id) {
  var timing;
  while (!(timing = node.__transition) || !(timing = timing[id])) {
    if (!(node = node.parentNode)) {
      throw new Error(`transition ${id} not found`);
    }
  }
  return timing;
}

function selection_transition(name) {
  var id,
      timing;

  if (name instanceof Transition) {
    id = name._id, name = name._name;
  } else {
    id = newId(), (timing = defaultTiming).time = now(), name = name == null ? null : name + "";
  }

  for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        schedule(node, name, id, i, group, timing || inherit(node, id));
      }
    }
  }

  return new Transition(groups, this._parents, name, id);
}

selection.prototype.interrupt = selection_interrupt;
selection.prototype.transition = selection_transition;

function center(x, y) {
  var nodes, strength = 1;

  if (x == null) x = 0;
  if (y == null) y = 0;

  function force() {
    var i,
        n = nodes.length,
        node,
        sx = 0,
        sy = 0;

    for (i = 0; i < n; ++i) {
      node = nodes[i], sx += node.x, sy += node.y;
    }

    for (sx = (sx / n - x) * strength, sy = (sy / n - y) * strength, i = 0; i < n; ++i) {
      node = nodes[i], node.x -= sx, node.y -= sy;
    }
  }

  force.initialize = function(_) {
    nodes = _;
  };

  force.x = function(_) {
    return arguments.length ? (x = +_, force) : x;
  };

  force.y = function(_) {
    return arguments.length ? (y = +_, force) : y;
  };

  force.strength = function(_) {
    return arguments.length ? (strength = +_, force) : strength;
  };

  return force;
}

function tree_add(d) {
  const x = +this._x.call(null, d),
      y = +this._y.call(null, d);
  return add(this.cover(x, y), x, y, d);
}

function add(tree, x, y, d) {
  if (isNaN(x) || isNaN(y)) return tree; // ignore invalid points

  var parent,
      node = tree._root,
      leaf = {data: d},
      x0 = tree._x0,
      y0 = tree._y0,
      x1 = tree._x1,
      y1 = tree._y1,
      xm,
      ym,
      xp,
      yp,
      right,
      bottom,
      i,
      j;

  // If the tree is empty, initialize the root as a leaf.
  if (!node) return tree._root = leaf, tree;

  // Find the existing leaf for the new point, or add it.
  while (node.length) {
    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
    if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
    if (parent = node, !(node = node[i = bottom << 1 | right])) return parent[i] = leaf, tree;
  }

  // Is the new point is exactly coincident with the existing point?
  xp = +tree._x.call(null, node.data);
  yp = +tree._y.call(null, node.data);
  if (x === xp && y === yp) return leaf.next = node, parent ? parent[i] = leaf : tree._root = leaf, tree;

  // Otherwise, split the leaf node until the old and new point are separated.
  do {
    parent = parent ? parent[i] = new Array(4) : tree._root = new Array(4);
    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
    if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
  } while ((i = bottom << 1 | right) === (j = (yp >= ym) << 1 | (xp >= xm)));
  return parent[j] = node, parent[i] = leaf, tree;
}

function addAll(data) {
  var d, i, n = data.length,
      x,
      y,
      xz = new Array(n),
      yz = new Array(n),
      x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;

  // Compute the points and their extent.
  for (i = 0; i < n; ++i) {
    if (isNaN(x = +this._x.call(null, d = data[i])) || isNaN(y = +this._y.call(null, d))) continue;
    xz[i] = x;
    yz[i] = y;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }

  // If there were no (valid) points, abort.
  if (x0 > x1 || y0 > y1) return this;

  // Expand the tree to cover the new points.
  this.cover(x0, y0).cover(x1, y1);

  // Add the new points.
  for (i = 0; i < n; ++i) {
    add(this, xz[i], yz[i], data[i]);
  }

  return this;
}

function tree_cover(x, y) {
  if (isNaN(x = +x) || isNaN(y = +y)) return this; // ignore invalid points

  var x0 = this._x0,
      y0 = this._y0,
      x1 = this._x1,
      y1 = this._y1;

  // If the quadtree has no extent, initialize them.
  // Integer extent are necessary so that if we later double the extent,
  // the existing quadrant boundaries don’t change due to floating point error!
  if (isNaN(x0)) {
    x1 = (x0 = Math.floor(x)) + 1;
    y1 = (y0 = Math.floor(y)) + 1;
  }

  // Otherwise, double repeatedly to cover.
  else {
    var z = x1 - x0 || 1,
        node = this._root,
        parent,
        i;

    while (x0 > x || x >= x1 || y0 > y || y >= y1) {
      i = (y < y0) << 1 | (x < x0);
      parent = new Array(4), parent[i] = node, node = parent, z *= 2;
      switch (i) {
        case 0: x1 = x0 + z, y1 = y0 + z; break;
        case 1: x0 = x1 - z, y1 = y0 + z; break;
        case 2: x1 = x0 + z, y0 = y1 - z; break;
        case 3: x0 = x1 - z, y0 = y1 - z; break;
      }
    }

    if (this._root && this._root.length) this._root = node;
  }

  this._x0 = x0;
  this._y0 = y0;
  this._x1 = x1;
  this._y1 = y1;
  return this;
}

function tree_data() {
  var data = [];
  this.visit(function(node) {
    if (!node.length) do data.push(node.data); while (node = node.next)
  });
  return data;
}

function tree_extent(_) {
  return arguments.length
      ? this.cover(+_[0][0], +_[0][1]).cover(+_[1][0], +_[1][1])
      : isNaN(this._x0) ? undefined : [[this._x0, this._y0], [this._x1, this._y1]];
}

function Quad(node, x0, y0, x1, y1) {
  this.node = node;
  this.x0 = x0;
  this.y0 = y0;
  this.x1 = x1;
  this.y1 = y1;
}

function tree_find(x, y, radius) {
  var data,
      x0 = this._x0,
      y0 = this._y0,
      x1,
      y1,
      x2,
      y2,
      x3 = this._x1,
      y3 = this._y1,
      quads = [],
      node = this._root,
      q,
      i;

  if (node) quads.push(new Quad(node, x0, y0, x3, y3));
  if (radius == null) radius = Infinity;
  else {
    x0 = x - radius, y0 = y - radius;
    x3 = x + radius, y3 = y + radius;
    radius *= radius;
  }

  while (q = quads.pop()) {

    // Stop searching if this quadrant can’t contain a closer node.
    if (!(node = q.node)
        || (x1 = q.x0) > x3
        || (y1 = q.y0) > y3
        || (x2 = q.x1) < x0
        || (y2 = q.y1) < y0) continue;

    // Bisect the current quadrant.
    if (node.length) {
      var xm = (x1 + x2) / 2,
          ym = (y1 + y2) / 2;

      quads.push(
        new Quad(node[3], xm, ym, x2, y2),
        new Quad(node[2], x1, ym, xm, y2),
        new Quad(node[1], xm, y1, x2, ym),
        new Quad(node[0], x1, y1, xm, ym)
      );

      // Visit the closest quadrant first.
      if (i = (y >= ym) << 1 | (x >= xm)) {
        q = quads[quads.length - 1];
        quads[quads.length - 1] = quads[quads.length - 1 - i];
        quads[quads.length - 1 - i] = q;
      }
    }

    // Visit this point. (Visiting coincident points isn’t necessary!)
    else {
      var dx = x - +this._x.call(null, node.data),
          dy = y - +this._y.call(null, node.data),
          d2 = dx * dx + dy * dy;
      if (d2 < radius) {
        var d = Math.sqrt(radius = d2);
        x0 = x - d, y0 = y - d;
        x3 = x + d, y3 = y + d;
        data = node.data;
      }
    }
  }

  return data;
}

function tree_remove(d) {
  if (isNaN(x = +this._x.call(null, d)) || isNaN(y = +this._y.call(null, d))) return this; // ignore invalid points

  var parent,
      node = this._root,
      retainer,
      previous,
      next,
      x0 = this._x0,
      y0 = this._y0,
      x1 = this._x1,
      y1 = this._y1,
      x,
      y,
      xm,
      ym,
      right,
      bottom,
      i,
      j;

  // If the tree is empty, initialize the root as a leaf.
  if (!node) return this;

  // Find the leaf node for the point.
  // While descending, also retain the deepest parent with a non-removed sibling.
  if (node.length) while (true) {
    if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
    if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
    if (!(parent = node, node = node[i = bottom << 1 | right])) return this;
    if (!node.length) break;
    if (parent[(i + 1) & 3] || parent[(i + 2) & 3] || parent[(i + 3) & 3]) retainer = parent, j = i;
  }

  // Find the point to remove.
  while (node.data !== d) if (!(previous = node, node = node.next)) return this;
  if (next = node.next) delete node.next;

  // If there are multiple coincident points, remove just the point.
  if (previous) return (next ? previous.next = next : delete previous.next), this;

  // If this is the root point, remove it.
  if (!parent) return this._root = next, this;

  // Remove this leaf.
  next ? parent[i] = next : delete parent[i];

  // If the parent now contains exactly one leaf, collapse superfluous parents.
  if ((node = parent[0] || parent[1] || parent[2] || parent[3])
      && node === (parent[3] || parent[2] || parent[1] || parent[0])
      && !node.length) {
    if (retainer) retainer[j] = node;
    else this._root = node;
  }

  return this;
}

function removeAll(data) {
  for (var i = 0, n = data.length; i < n; ++i) this.remove(data[i]);
  return this;
}

function tree_root() {
  return this._root;
}

function tree_size() {
  var size = 0;
  this.visit(function(node) {
    if (!node.length) do ++size; while (node = node.next)
  });
  return size;
}

function tree_visit(callback) {
  var quads = [], q, node = this._root, child, x0, y0, x1, y1;
  if (node) quads.push(new Quad(node, this._x0, this._y0, this._x1, this._y1));
  while (q = quads.pop()) {
    if (!callback(node = q.node, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1) && node.length) {
      var xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
      if (child = node[3]) quads.push(new Quad(child, xm, ym, x1, y1));
      if (child = node[2]) quads.push(new Quad(child, x0, ym, xm, y1));
      if (child = node[1]) quads.push(new Quad(child, xm, y0, x1, ym));
      if (child = node[0]) quads.push(new Quad(child, x0, y0, xm, ym));
    }
  }
  return this;
}

function tree_visitAfter(callback) {
  var quads = [], next = [], q;
  if (this._root) quads.push(new Quad(this._root, this._x0, this._y0, this._x1, this._y1));
  while (q = quads.pop()) {
    var node = q.node;
    if (node.length) {
      var child, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1, xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
      if (child = node[0]) quads.push(new Quad(child, x0, y0, xm, ym));
      if (child = node[1]) quads.push(new Quad(child, xm, y0, x1, ym));
      if (child = node[2]) quads.push(new Quad(child, x0, ym, xm, y1));
      if (child = node[3]) quads.push(new Quad(child, xm, ym, x1, y1));
    }
    next.push(q);
  }
  while (q = next.pop()) {
    callback(q.node, q.x0, q.y0, q.x1, q.y1);
  }
  return this;
}

function defaultX(d) {
  return d[0];
}

function tree_x(_) {
  return arguments.length ? (this._x = _, this) : this._x;
}

function defaultY(d) {
  return d[1];
}

function tree_y(_) {
  return arguments.length ? (this._y = _, this) : this._y;
}

function quadtree(nodes, x, y) {
  var tree = new Quadtree(x == null ? defaultX : x, y == null ? defaultY : y, NaN, NaN, NaN, NaN);
  return nodes == null ? tree : tree.addAll(nodes);
}

function Quadtree(x, y, x0, y0, x1, y1) {
  this._x = x;
  this._y = y;
  this._x0 = x0;
  this._y0 = y0;
  this._x1 = x1;
  this._y1 = y1;
  this._root = undefined;
}

function leaf_copy(leaf) {
  var copy = {data: leaf.data}, next = copy;
  while (leaf = leaf.next) next = next.next = {data: leaf.data};
  return copy;
}

var treeProto = quadtree.prototype = Quadtree.prototype;

treeProto.copy = function() {
  var copy = new Quadtree(this._x, this._y, this._x0, this._y0, this._x1, this._y1),
      node = this._root,
      nodes,
      child;

  if (!node) return copy;

  if (!node.length) return copy._root = leaf_copy(node), copy;

  nodes = [{source: node, target: copy._root = new Array(4)}];
  while (node = nodes.pop()) {
    for (var i = 0; i < 4; ++i) {
      if (child = node.source[i]) {
        if (child.length) nodes.push({source: child, target: node.target[i] = new Array(4)});
        else node.target[i] = leaf_copy(child);
      }
    }
  }

  return copy;
};

treeProto.add = tree_add;
treeProto.addAll = addAll;
treeProto.cover = tree_cover;
treeProto.data = tree_data;
treeProto.extent = tree_extent;
treeProto.find = tree_find;
treeProto.remove = tree_remove;
treeProto.removeAll = removeAll;
treeProto.root = tree_root;
treeProto.size = tree_size;
treeProto.visit = tree_visit;
treeProto.visitAfter = tree_visitAfter;
treeProto.x = tree_x;
treeProto.y = tree_y;

function constant(x) {
  return function() {
    return x;
  };
}

function jiggle(random) {
  return (random() - 0.5) * 1e-6;
}

function x$2(d) {
  return d.x + d.vx;
}

function y$2(d) {
  return d.y + d.vy;
}

function collide(radius) {
  var nodes,
      radii,
      random,
      strength = 1,
      iterations = 1;

  if (typeof radius !== "function") radius = constant(radius == null ? 1 : +radius);

  function force() {
    var i, n = nodes.length,
        tree,
        node,
        xi,
        yi,
        ri,
        ri2;

    for (var k = 0; k < iterations; ++k) {
      tree = quadtree(nodes, x$2, y$2).visitAfter(prepare);
      for (i = 0; i < n; ++i) {
        node = nodes[i];
        ri = radii[node.index], ri2 = ri * ri;
        xi = node.x + node.vx;
        yi = node.y + node.vy;
        tree.visit(apply);
      }
    }

    function apply(quad, x0, y0, x1, y1) {
      var data = quad.data, rj = quad.r, r = ri + rj;
      if (data) {
        if (data.index > node.index) {
          var x = xi - data.x - data.vx,
              y = yi - data.y - data.vy,
              l = x * x + y * y;
          if (l < r * r) {
            if (x === 0) x = jiggle(random), l += x * x;
            if (y === 0) y = jiggle(random), l += y * y;
            l = (r - (l = Math.sqrt(l))) / l * strength;
            node.vx += (x *= l) * (r = (rj *= rj) / (ri2 + rj));
            node.vy += (y *= l) * r;
            data.vx -= x * (r = 1 - r);
            data.vy -= y * r;
          }
        }
        return;
      }
      return x0 > xi + r || x1 < xi - r || y0 > yi + r || y1 < yi - r;
    }
  }

  function prepare(quad) {
    if (quad.data) return quad.r = radii[quad.data.index];
    for (var i = quad.r = 0; i < 4; ++i) {
      if (quad[i] && quad[i].r > quad.r) {
        quad.r = quad[i].r;
      }
    }
  }

  function initialize() {
    if (!nodes) return;
    var i, n = nodes.length, node;
    radii = new Array(n);
    for (i = 0; i < n; ++i) node = nodes[i], radii[node.index] = +radius(node, i, nodes);
  }

  force.initialize = function(_nodes, _random) {
    nodes = _nodes;
    random = _random;
    initialize();
  };

  force.iterations = function(_) {
    return arguments.length ? (iterations = +_, force) : iterations;
  };

  force.strength = function(_) {
    return arguments.length ? (strength = +_, force) : strength;
  };

  force.radius = function(_) {
    return arguments.length ? (radius = typeof _ === "function" ? _ : constant(+_), initialize(), force) : radius;
  };

  return force;
}

function index(d) {
  return d.index;
}

function find(nodeById, nodeId) {
  var node = nodeById.get(nodeId);
  if (!node) throw new Error("node not found: " + nodeId);
  return node;
}

function link(links) {
  var id = index,
      strength = defaultStrength,
      strengths,
      distance = constant(30),
      distances,
      nodes,
      count,
      bias,
      random,
      iterations = 1;

  if (links == null) links = [];

  function defaultStrength(link) {
    return 1 / Math.min(count[link.source.index], count[link.target.index]);
  }

  function force(alpha) {
    for (var k = 0, n = links.length; k < iterations; ++k) {
      for (var i = 0, link, source, target, x, y, l, b; i < n; ++i) {
        link = links[i], source = link.source, target = link.target;
        x = target.x + target.vx - source.x - source.vx || jiggle(random);
        y = target.y + target.vy - source.y - source.vy || jiggle(random);
        l = Math.sqrt(x * x + y * y);
        l = (l - distances[i]) / l * alpha * strengths[i];
        x *= l, y *= l;
        target.vx -= x * (b = bias[i]);
        target.vy -= y * b;
        source.vx += x * (b = 1 - b);
        source.vy += y * b;
      }
    }
  }

  function initialize() {
    if (!nodes) return;

    var i,
        n = nodes.length,
        m = links.length,
        nodeById = new Map(nodes.map((d, i) => [id(d, i, nodes), d])),
        link;

    for (i = 0, count = new Array(n); i < m; ++i) {
      link = links[i], link.index = i;
      if (typeof link.source !== "object") link.source = find(nodeById, link.source);
      if (typeof link.target !== "object") link.target = find(nodeById, link.target);
      count[link.source.index] = (count[link.source.index] || 0) + 1;
      count[link.target.index] = (count[link.target.index] || 0) + 1;
    }

    for (i = 0, bias = new Array(m); i < m; ++i) {
      link = links[i], bias[i] = count[link.source.index] / (count[link.source.index] + count[link.target.index]);
    }

    strengths = new Array(m), initializeStrength();
    distances = new Array(m), initializeDistance();
  }

  function initializeStrength() {
    if (!nodes) return;

    for (var i = 0, n = links.length; i < n; ++i) {
      strengths[i] = +strength(links[i], i, links);
    }
  }

  function initializeDistance() {
    if (!nodes) return;

    for (var i = 0, n = links.length; i < n; ++i) {
      distances[i] = +distance(links[i], i, links);
    }
  }

  force.initialize = function(_nodes, _random) {
    nodes = _nodes;
    random = _random;
    initialize();
  };

  force.links = function(_) {
    return arguments.length ? (links = _, initialize(), force) : links;
  };

  force.id = function(_) {
    return arguments.length ? (id = _, force) : id;
  };

  force.iterations = function(_) {
    return arguments.length ? (iterations = +_, force) : iterations;
  };

  force.strength = function(_) {
    return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initializeStrength(), force) : strength;
  };

  force.distance = function(_) {
    return arguments.length ? (distance = typeof _ === "function" ? _ : constant(+_), initializeDistance(), force) : distance;
  };

  return force;
}

// https://en.wikipedia.org/wiki/Linear_congruential_generator#Parameters_in_common_use
const a = 1664525;
const c = 1013904223;
const m = 4294967296; // 2^32

function lcg() {
  let s = 1;
  return () => (s = (a * s + c) % m) / m;
}

function x$1(d) {
  return d.x;
}

function y$1(d) {
  return d.y;
}

var initialRadius = 10,
    initialAngle = Math.PI * (3 - Math.sqrt(5));

function simulation(nodes) {
  var simulation,
      alpha = 1,
      alphaMin = 0.001,
      alphaDecay = 1 - Math.pow(alphaMin, 1 / 300),
      alphaTarget = 0,
      velocityDecay = 0.6,
      forces = new Map(),
      stepper = timer(step),
      event = dispatch("tick", "end"),
      random = lcg();

  if (nodes == null) nodes = [];

  function step() {
    tick();
    event.call("tick", simulation);
    if (alpha < alphaMin) {
      stepper.stop();
      event.call("end", simulation);
    }
  }

  function tick(iterations) {
    var i, n = nodes.length, node;

    if (iterations === undefined) iterations = 1;

    for (var k = 0; k < iterations; ++k) {
      alpha += (alphaTarget - alpha) * alphaDecay;

      forces.forEach(function(force) {
        force(alpha);
      });

      for (i = 0; i < n; ++i) {
        node = nodes[i];
        if (node.fx == null) node.x += node.vx *= velocityDecay;
        else node.x = node.fx, node.vx = 0;
        if (node.fy == null) node.y += node.vy *= velocityDecay;
        else node.y = node.fy, node.vy = 0;
      }
    }

    return simulation;
  }

  function initializeNodes() {
    for (var i = 0, n = nodes.length, node; i < n; ++i) {
      node = nodes[i], node.index = i;
      if (node.fx != null) node.x = node.fx;
      if (node.fy != null) node.y = node.fy;
      if (isNaN(node.x) || isNaN(node.y)) {
        var radius = initialRadius * Math.sqrt(0.5 + i), angle = i * initialAngle;
        node.x = radius * Math.cos(angle);
        node.y = radius * Math.sin(angle);
      }
      if (isNaN(node.vx) || isNaN(node.vy)) {
        node.vx = node.vy = 0;
      }
    }
  }

  function initializeForce(force) {
    if (force.initialize) force.initialize(nodes, random);
    return force;
  }

  initializeNodes();

  return simulation = {
    tick: tick,

    restart: function() {
      return stepper.restart(step), simulation;
    },

    stop: function() {
      return stepper.stop(), simulation;
    },

    nodes: function(_) {
      return arguments.length ? (nodes = _, initializeNodes(), forces.forEach(initializeForce), simulation) : nodes;
    },

    alpha: function(_) {
      return arguments.length ? (alpha = +_, simulation) : alpha;
    },

    alphaMin: function(_) {
      return arguments.length ? (alphaMin = +_, simulation) : alphaMin;
    },

    alphaDecay: function(_) {
      return arguments.length ? (alphaDecay = +_, simulation) : +alphaDecay;
    },

    alphaTarget: function(_) {
      return arguments.length ? (alphaTarget = +_, simulation) : alphaTarget;
    },

    velocityDecay: function(_) {
      return arguments.length ? (velocityDecay = 1 - _, simulation) : 1 - velocityDecay;
    },

    randomSource: function(_) {
      return arguments.length ? (random = _, forces.forEach(initializeForce), simulation) : random;
    },

    force: function(name, _) {
      return arguments.length > 1 ? ((_ == null ? forces.delete(name) : forces.set(name, initializeForce(_))), simulation) : forces.get(name);
    },

    find: function(x, y, radius) {
      var i = 0,
          n = nodes.length,
          dx,
          dy,
          d2,
          node,
          closest;

      if (radius == null) radius = Infinity;
      else radius *= radius;

      for (i = 0; i < n; ++i) {
        node = nodes[i];
        dx = x - node.x;
        dy = y - node.y;
        d2 = dx * dx + dy * dy;
        if (d2 < radius) closest = node, radius = d2;
      }

      return closest;
    },

    on: function(name, _) {
      return arguments.length > 1 ? (event.on(name, _), simulation) : event.on(name);
    }
  };
}

function manyBody() {
  var nodes,
      node,
      random,
      alpha,
      strength = constant(-30),
      strengths,
      distanceMin2 = 1,
      distanceMax2 = Infinity,
      theta2 = 0.81;

  function force(_) {
    var i, n = nodes.length, tree = quadtree(nodes, x$1, y$1).visitAfter(accumulate);
    for (alpha = _, i = 0; i < n; ++i) node = nodes[i], tree.visit(apply);
  }

  function initialize() {
    if (!nodes) return;
    var i, n = nodes.length, node;
    strengths = new Array(n);
    for (i = 0; i < n; ++i) node = nodes[i], strengths[node.index] = +strength(node, i, nodes);
  }

  function accumulate(quad) {
    var strength = 0, q, c, weight = 0, x, y, i;

    // For internal nodes, accumulate forces from child quadrants.
    if (quad.length) {
      for (x = y = i = 0; i < 4; ++i) {
        if ((q = quad[i]) && (c = Math.abs(q.value))) {
          strength += q.value, weight += c, x += c * q.x, y += c * q.y;
        }
      }
      quad.x = x / weight;
      quad.y = y / weight;
    }

    // For leaf nodes, accumulate forces from coincident quadrants.
    else {
      q = quad;
      q.x = q.data.x;
      q.y = q.data.y;
      do strength += strengths[q.data.index];
      while (q = q.next);
    }

    quad.value = strength;
  }

  function apply(quad, x1, _, x2) {
    if (!quad.value) return true;

    var x = quad.x - node.x,
        y = quad.y - node.y,
        w = x2 - x1,
        l = x * x + y * y;

    // Apply the Barnes-Hut approximation if possible.
    // Limit forces for very close nodes; randomize direction if coincident.
    if (w * w / theta2 < l) {
      if (l < distanceMax2) {
        if (x === 0) x = jiggle(random), l += x * x;
        if (y === 0) y = jiggle(random), l += y * y;
        if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
        node.vx += x * quad.value * alpha / l;
        node.vy += y * quad.value * alpha / l;
      }
      return true;
    }

    // Otherwise, process points directly.
    else if (quad.length || l >= distanceMax2) return;

    // Limit forces for very close nodes; randomize direction if coincident.
    if (quad.data !== node || quad.next) {
      if (x === 0) x = jiggle(random), l += x * x;
      if (y === 0) y = jiggle(random), l += y * y;
      if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
    }

    do if (quad.data !== node) {
      w = strengths[quad.data.index] * alpha / l;
      node.vx += x * w;
      node.vy += y * w;
    } while (quad = quad.next);
  }

  force.initialize = function(_nodes, _random) {
    nodes = _nodes;
    random = _random;
    initialize();
  };

  force.strength = function(_) {
    return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initialize(), force) : strength;
  };

  force.distanceMin = function(_) {
    return arguments.length ? (distanceMin2 = _ * _, force) : Math.sqrt(distanceMin2);
  };

  force.distanceMax = function(_) {
    return arguments.length ? (distanceMax2 = _ * _, force) : Math.sqrt(distanceMax2);
  };

  force.theta = function(_) {
    return arguments.length ? (theta2 = _ * _, force) : Math.sqrt(theta2);
  };

  return force;
}

function x(x) {
  var strength = constant(0.1),
      nodes,
      strengths,
      xz;

  if (typeof x !== "function") x = constant(x == null ? 0 : +x);

  function force(alpha) {
    for (var i = 0, n = nodes.length, node; i < n; ++i) {
      node = nodes[i], node.vx += (xz[i] - node.x) * strengths[i] * alpha;
    }
  }

  function initialize() {
    if (!nodes) return;
    var i, n = nodes.length;
    strengths = new Array(n);
    xz = new Array(n);
    for (i = 0; i < n; ++i) {
      strengths[i] = isNaN(xz[i] = +x(nodes[i], i, nodes)) ? 0 : +strength(nodes[i], i, nodes);
    }
  }

  force.initialize = function(_) {
    nodes = _;
    initialize();
  };

  force.strength = function(_) {
    return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initialize(), force) : strength;
  };

  force.x = function(_) {
    return arguments.length ? (x = typeof _ === "function" ? _ : constant(+_), initialize(), force) : x;
  };

  return force;
}

function y(y) {
  var strength = constant(0.1),
      nodes,
      strengths,
      yz;

  if (typeof y !== "function") y = constant(y == null ? 0 : +y);

  function force(alpha) {
    for (var i = 0, n = nodes.length, node; i < n; ++i) {
      node = nodes[i], node.vy += (yz[i] - node.y) * strengths[i] * alpha;
    }
  }

  function initialize() {
    if (!nodes) return;
    var i, n = nodes.length;
    strengths = new Array(n);
    yz = new Array(n);
    for (i = 0; i < n; ++i) {
      strengths[i] = isNaN(yz[i] = +y(nodes[i], i, nodes)) ? 0 : +strength(nodes[i], i, nodes);
    }
  }

  force.initialize = function(_) {
    nodes = _;
    initialize();
  };

  force.strength = function(_) {
    return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initialize(), force) : strength;
  };

  force.y = function(_) {
    return arguments.length ? (y = typeof _ === "function" ? _ : constant(+_), initialize(), force) : y;
  };

  return force;
}

function Transform(k, x, y) {
  this.k = k;
  this.x = x;
  this.y = y;
}

Transform.prototype = {
  constructor: Transform,
  scale: function(k) {
    return k === 1 ? this : new Transform(this.k * k, this.x, this.y);
  },
  translate: function(x, y) {
    return x === 0 & y === 0 ? this : new Transform(this.k, this.x + this.k * x, this.y + this.k * y);
  },
  apply: function(point) {
    return [point[0] * this.k + this.x, point[1] * this.k + this.y];
  },
  applyX: function(x) {
    return x * this.k + this.x;
  },
  applyY: function(y) {
    return y * this.k + this.y;
  },
  invert: function(location) {
    return [(location[0] - this.x) / this.k, (location[1] - this.y) / this.k];
  },
  invertX: function(x) {
    return (x - this.x) / this.k;
  },
  invertY: function(y) {
    return (y - this.y) / this.k;
  },
  rescaleX: function(x) {
    return x.copy().domain(x.range().map(this.invertX, this).map(x.invert, x));
  },
  rescaleY: function(y) {
    return y.copy().domain(y.range().map(this.invertY, this).map(y.invert, y));
  },
  toString: function() {
    return "translate(" + this.x + "," + this.y + ") scale(" + this.k + ")";
  }
};

Transform.prototype;

/**
 * Utilitaire pour récupérer des données SPARQL avec gestion automatique CORS/proxy
 * Réutilisable dans plusieurs composants
 */
class SparqlDataFetcher {
  constructor() {
    this.currentEndpoint = null;
    this.currentProxyUrl = null;
  }

  /**
   * Affiche une erreur personnalisée
   */
  showCustomProxyError() {
    console.error('🚫 [SparqlDataFetcher] Problème de CORS détecté ou proxy non fonctionnel.');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('ℹ️ Pour résoudre ce problème, vous devez configurer un serveur proxy local.');
    console.error('📖 DOCUMENTATION COMPLÈTE:');
    console.error('   👉 https://github.com/Ye4hL0w/test-visualisator/blob/main/docs/proxy-setup.md');
    console.error('');
    console.error('🚀 RÉSUMÉ RAPIDE:');
    console.error('   1. Créez le fichier server/proxy.js (code dans la doc)');
    console.error('   2. Installez: npm install express node-fetch@2 cors');
    console.error('   3. Lancez: node server/proxy.js');
    console.error('   4. Rafraîchissez cette page');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  /**
   * Détecter si l'erreur est due à CORS
   */
  isCorsError(error) {
    const corsIndicators = [
      'Failed to fetch',
      'NetworkError',
      'CORS',
      'Cross-Origin',
      'blocked by CORS policy',
      'Access-Control-Allow-Origin',
      'TypeError: Failed to fetch'
    ];
    
    return corsIndicators.some(indicator => 
      error.message.includes(indicator) || error.toString().includes(indicator)
    );
  }

  /**
   * Exécute une requête SPARQL avec hiérarchie : proxy en priorité si fourni, sinon endpoint direct puis proxy
   */
  async executeSparqlQueryWithFallback(endpoint, query, proxyUrl = null, onProxyError = null, onNotification = null) {
    console.log('[SparqlDataFetcher] Début de l\'exécution de la requête SPARQL');
    console.log('[SparqlDataFetcher] Endpoint cible:', endpoint);
    
    // NOUVELLE LOGIQUE : Si proxy fourni, l'utiliser en priorité
    const proxyIsProvided = proxyUrl && proxyUrl.trim() !== '';
    if (proxyIsProvided) {
      console.log('[SparqlDataFetcher] 🚀 Proxy fourni, utilisation en priorité');
      try {
        console.log(`[SparqlDataFetcher] Tentative prioritaire: Proxy configuré via ${proxyUrl}`);
        
        const params = new URLSearchParams({ endpoint: endpoint, query: query });
        const fullProxyUrl = `${proxyUrl}?${params.toString()}`;

        const response = await fetch(fullProxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/sparql-results+json, application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Proxy error (${response.status}): ${errorData}`);
        }
        const result = await response.json();
        console.log('[SparqlDataFetcher] ✅ Succès avec proxy en priorité');
        return result;
      } catch (proxyError) {
        console.error('[SparqlDataFetcher] Échec avec proxy en priorité:', proxyError.message);
        
        const isProxyConnectionError = proxyError.message.includes('Failed to fetch') || 
                                      proxyError.message.includes('Connection refused') ||
                                      proxyError.message.includes('Network Error');
        
        if (isProxyConnectionError) {
          this.showCustomProxyError();
          if (onProxyError) onProxyError();
          if (onNotification) onNotification(`Le proxy configuré sur ${proxyUrl} semble ne pas fonctionner. Vérifiez que le proxy est démarré et accessible.`, 'error');
        } else {
          if (onNotification) onNotification(`Erreur de l'endpoint SPARQL distant via proxy. Vérifiez l'URL de l'endpoint ou essayez une requête plus simple.`, 'error');
          console.error('[SparqlDataFetcher] L\'endpoint SPARQL distant a retourné une erreur via proxy:', proxyError.message);
        }
        
        throw new Error(`Proxy configuré à ${proxyUrl} a échoué en priorité. Détails: ${proxyError.message}`);
      }
    }
    
    // LOGIQUE EXISTANTE : Endpoint direct puis proxy en fallback
    // 1 : Endpoint direct
    try {
      console.log('[SparqlDataFetcher] Tentative 1: Endpoint direct');
      return await this.executeSparqlQuery(endpoint, query);
    } catch (directError) {
      console.warn('[SparqlDataFetcher] Échec avec endpoint direct:', directError.message);
      
      // Vérification de si c'est bien une erreur CORS
      if (this.isCorsError(directError)) {
        console.log('[SparqlDataFetcher] 🎯 Erreur CORS détectée - Tentative avec proxy local...');

        // Vérifier si une URL de proxy est bien fournie
        if (!proxyUrl) {
          console.error('[SparqlDataFetcher] ❌ Aucune URL de proxy fournie pour contourner CORS');
          this.showCustomProxyError();
          if (onProxyError) onProxyError();
          if (onNotification) onNotification('Erreur CORS détectée mais aucune URL de proxy configurée. Veuillez configurer un proxy SPARQL.', 'error');
          throw new Error('Erreur CORS - URL de proxy manquante');
        }

        // 2 : Proxy configuré par l'utilisateur
        try {
          console.log(`[SparqlDataFetcher] Tentative 2: Proxy configuré via ${proxyUrl}`);
          
          const params = new URLSearchParams({ endpoint: endpoint, query: query });
          const fullProxyUrl = `${proxyUrl}?${params.toString()}`;

          const response = await fetch(fullProxyUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/sparql-results+json, application/json'
            }
          });

          if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Proxy error (${response.status}): ${errorData}`);
          }
          const result = await response.json();
          console.log('[SparqlDataFetcher] ✅ Succès avec proxy configuré');
          return result;
        } catch (proxyError) {
          console.error('[SparqlDataFetcher] Échec avec proxy configuré:', proxyError.message);
          
          const isProxyConnectionError = proxyError.message.includes('Failed to fetch') || 
                                        proxyError.message.includes('Connection refused') ||
                                        proxyError.message.includes('Network Error');
          
          if (isProxyConnectionError) {
            this.showCustomProxyError();
            if (onProxyError) onProxyError();
            if (onNotification) onNotification(`Le proxy configuré sur ${proxyUrl} semble ne pas fonctionner. Vérifiez que le proxy est démarré et accessible.`, 'error');
          } else {
            if (onNotification) onNotification(`Erreur de l'endpoint SPARQL distant. Vérifiez l'URL de l'endpoint ou essayez une requête plus simple.`, 'error');
            console.error('[SparqlDataFetcher] L\'endpoint SPARQL distant a retourné une erreur:', proxyError.message);
          }
          
          throw new Error(`Proxy configuré à ${proxyUrl} a échoué après une erreur CORS. Détails: ${proxyError.message}`);
        }
      } else {
        console.error('[SparqlDataFetcher] Erreur non-CORS avec endpoint direct:', directError);
        throw directError;
      }
    }
  }

  /**
   * Exécute une requête SPARQL directe
   */
  async executeSparqlQuery(endpoint, query) {
    const params = new URLSearchParams();
    params.append('query', query.trim());
    params.append('format', 'json');
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/sparql-results+json'
      },
      body: params
    });
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Récupère les données avec hiérarchie : JSON direct > endpoint > proxy
   * MÉTHODE INTERNE : Utilisée par les composants pour récupérer les données brutes SPARQL
   */
  async fetchSparqlData(endpoint, query, jsonData = null, proxyUrl = null, onProxyError = null, onNotification = null) {
    try {
      // 1: Données JSON fournies directement
      if (jsonData) {
        console.log('[SparqlDataFetcher] 🎯 Utilisation des données JSON fournies directement');
        
        return {
          status: 'success',
          method: 'direct-json',
          message: `Données chargées depuis JSON`,
          data: jsonData,
          rawData: jsonData
        };
      }
      
      // 2 et 3: Endpoint puis proxy
      console.log('[SparqlDataFetcher] 🔍 Récupération des données depuis l\'endpoint...');
      this.currentEndpoint = endpoint;
      this.currentProxyUrl = proxyUrl;
      
      const rawData = await this.executeSparqlQueryWithFallback(endpoint, query, proxyUrl, onProxyError, onNotification);
      
      return {
        status: 'success',
        method: 'endpoint-or-proxy',
        message: `Données chargées depuis l'endpoint`,
        data: rawData,
        rawData: rawData
      };
    } catch (error) {
      console.error('[SparqlDataFetcher] ❌ Erreur lors du chargement des données:', error.message);
      return {
        status: 'error',
        message: `Erreur: ${error.message}`,
        data: null,
        rawData: null
      };
    }
  }
}

/**
 * Composant simplifié de visualisation de graphe D3.js
 */

class VisGraph extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.nodes = [];
    this.links = [];
    this.width = 800;
    this.height = 600;
    this.selectedNode = null;
    this.tooltipTimeout = null;
    this.currentEndpoint = null; // Stocker l'endpoint actif
    this.currentProxyUrl = null; // Stocker l'URL du proxy configurée
    this.sparqlData = null; // Stocker les données brutes de la requête SPARQL
    
    // Instance du fetcher pour récupérer les données SPARQL
    this.sparqlFetcher = new SparqlDataFetcher();
    
    // To organize private attributes (e.g. query, endpoint, proxy)
    this.internalData = new WeakMap();
    this.internalData.set(this, {}); // Initialize internal storage
  }

  // Getters and setters for SPARQL configuration
  set sparqlQuery(query) {
    const data = this.internalData.get(this) || {};
    data.sparqlQuery = query;
    this.internalData.set(this, data);
  }
  
  get sparqlQuery() {
    return this.internalData.get(this)?.sparqlQuery;
  }

  set sparqlEndpoint(endpoint) {
    const data = this.internalData.get(this) || {};
    data.sparqlEndpoint = endpoint;
    this.internalData.set(this, data);
  }
  
  get sparqlEndpoint() {
    return this.internalData.get(this)?.sparqlEndpoint;
  }

  set sparqlProxy(url) {
    const data = this.internalData.get(this) || {};
    data.sparqlProxy = url;
    this.internalData.set(this, data);
  }
  
  get sparqlProxy() {
    return this.internalData.get(this)?.sparqlProxy;
  }

  /**
   * Execute SPARQL query using the configured endpoint, query and proxy
   * This is the new simplified method that uses the getters/setters
   */
  async setSparqlQuery() {
    const endpoint = this.sparqlEndpoint;
    const query = this.sparqlQuery;
    const proxyUrl = this.sparqlProxy;
    
    if (!endpoint || !query) {
      throw new Error('Veuillez configurer sparqlEndpoint et sparqlQuery avant d\'exécuter la requête');
    }
    
    return await this.loadFromSparqlEndpoint(endpoint, query, null, proxyUrl);
  }

  /**
   * Liste des attributs à observer
   */
  static get observedAttributes() {
    return ['width', 'height'];
  }

  /**
   * Gestion des changements d'attributs
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === 'width') {
      this.width = parseInt(newValue) || 800;
      this.render();
    } else if (name === 'height') {
      this.height = parseInt(newValue) || 600;
      this.render();
    }
  }

  /**
   * Initialisation quand le composant est ajouté au DOM
   */
  connectedCallback() {
    this.render();
  }

  /**
   * Définit manuellement les données (priorité absolue)
   */
  setData(nodes, links) {
    console.log('[vis-graph] 📋 Définition manuelle des données');
    this.nodes = nodes;
    this.links = links;
    this.render();
  }

  /**
   * Charge des données JSON pré-formatées
   */
  setSparqlResult(jsonData) {
    console.log('[vis-graph] 📄 Chargement de données JSON pré-formatées');
    return this.loadFromSparqlEndpoint(null, null, jsonData);
  }

  /**
   * Affiche une erreur proxy en créant un panneau dans l'interface
   */
  showProxyErrorPanel() {
    const oldPanel = this.shadowRoot.querySelector('.node-details-panel');
    if (oldPanel) {
      oldPanel.remove();
    }
    
    const errorPanel = document.createElement('div');
    errorPanel.className = 'proxy-error-panel';
    errorPanel.innerHTML = `
      <div class="error-header">
        <h2>🚫 Configuration Proxy Requise</h2>
        <button class="close-btn">×</button>
      </div>
      <div class="error-content">
        <div class="error-message">
          <p><strong>Le composant n'a pas pu accéder directement à l'endpoint SPARQL à cause des restrictions CORS.</strong></p>
          <p>Un proxy local est nécessaire pour contourner ces limitations.</p>
        </div>
        <div class="error-actions">
          <button class="doc-button" onclick="window.open('https://github.com/Ye4hL0w/test-visualisator/blob/main/docs/proxy-setup.md', '_blank')">
            📖 Guide de configuration du proxy
          </button>
        </div>
      </div>
    `;
    
    // Gestionnaire de fermeture
    errorPanel.querySelector('.close-btn').addEventListener('click', () => {
      errorPanel.remove();
    });
    
    this.shadowRoot.querySelector('.graph-container').appendChild(errorPanel);
  }

  /**
   * Charge les données avec hiérarchie : JSON direct > endpoint > proxy
   * MÉTHODE PUBLIQUE : C'est l'interface principale pour les utilisateurs du composant
   * Le composant délègue la récupération des données au SparqlDataFetcher puis transforme les résultats
   */
  async loadFromSparqlEndpoint(endpoint, query, jsonData = null, proxyUrl = null) {
    try {
      this.currentEndpoint = endpoint;
      this.currentProxyUrl = proxyUrl;
      
      const result = await this.sparqlFetcher.fetchSparqlData(
        endpoint, 
        query, 
        jsonData,
        proxyUrl,
        () => this.showProxyErrorPanel(), // Callback pour afficher le panneau d'erreur proxy
        (message, type) => this.showNotification(message, type) // Callback pour les notifications
      );
      
      if (result.status === 'success') {
        this.sparqlData = result.data; // Conserver les données brutes

        if (result.method === 'direct-json') {
          // Données JSON directes
          const transformedData = this.transformSparqlResults(result.data);
          this.nodes = transformedData.nodes;
          this.links = transformedData.links;
          this.render();
          
          return {
            ...result,
            message: `Données chargées depuis JSON: ${this.nodes.length} nœuds, ${this.links.length} liens`,
            data: transformedData
          };
        } else {
          // Données depuis endpoint/proxy
          const transformedData = this.transformSparqlResults(result.data);
          this.nodes = transformedData.nodes;
          this.links = transformedData.links;
          this.render();
          
          return {
            ...result,
            message: `Données chargées: ${this.nodes.length} nœuds, ${this.links.length} liens`,
            data: transformedData
          };
        }
      }
      
      return result;
    } catch (error) {
      console.error('[vis-graph] ❌ Erreur lors du chargement des données:', error.message);
      return {
        status: 'error',
        message: `Erreur: ${error.message}`,
        data: null,
        rawData: null
      };
    }
  }

  /**
   * Essaie de déterminer le label le plus pertinent pour un nœud à partir d'un binding SPARQL.
   * @param {object} entityBindingValue - L'objet binding pour l'entité (ex: binding[sourceVar]).
   * @param {string} entityVarName - Le nom de la variable SPARQL pour l'entité (ex: "gene", "proteinOrtholog").
   * @param {object} currentBinding - L'ensemble du binding (la ligne de résultat SPARQL).
   * @param {string[]} allVars - Toutes les variables de la requête SPARQL.
   */
  _determineNodeLabelFromBinding(entityBindingValue, entityVarName, currentBinding, allVars) {
    const defaultId = this.extractIdFromBinding(entityBindingValue);

    if (!entityBindingValue) return defaultId;

    // Priorité 1: Valeur littérale de l'entité elle-même.
    if (entityBindingValue.type === 'literal') {
      return entityBindingValue.value;
    }

    // Si c'est une URI, chercher des labels associés.
    if (entityBindingValue.type === 'uri') {
      // Priorité 2: Labels conventionnels directs (ex: geneLabel pour gene).
      const directLabelSuffixes = ['Label', 'Name', 'Title', 'Term', 'Identifier', 'Id', 'Description'];
      for (const suffix of directLabelSuffixes) {
        const directLabelKey = entityVarName + suffix;
        if (currentBinding[directLabelKey] && currentBinding[directLabelKey].type === 'literal') {
          return currentBinding[directLabelKey].value;
        }
        // Essayer aussi avec la première lettre en minuscule pour le suffixe (ex: entityVarName + 'label')
        const directLabelKeyLowerSuffix = entityVarName + suffix.charAt(0).toLowerCase() + suffix.slice(1);
        if (currentBinding[directLabelKeyLowerSuffix] && currentBinding[directLabelKeyLowerSuffix].type === 'literal') {
          return currentBinding[directLabelKeyLowerSuffix].value;
        }
      }
      
      // Priorité 3: Labels descriptifs d'autres colonnes.
      let bestOtherLabel = null;
      let bestOtherLabelScore = -1;

      const descriptiveKeywords = {
        label: 5, name: 5, title: 5, term: 4, // Forte pertinence
        description: 3, summary: 3, comment: 3, text: 2, // Pertinence moyenne
        taxon: 2, species: 2, organism: 2, // Contexte taxonomique
        disease: 2, condition: 2, syndrome: 2, // Contexte maladie
        gene: 1, protein: 1, ensembl: 1, uniprot: 1, // Identifiants/types communs
        annotation: 1
      };

      for (const otherVar of allVars) {
        if (otherVar === entityVarName) continue; // Ne pas se considérer soi-même

        const otherVarBinding = currentBinding[otherVar];
        if (otherVarBinding && otherVarBinding.type === 'literal' && otherVarBinding.value) {
          const otherVarLower = otherVar.toLowerCase();
          let currentScore = 0;

          for (const keyword in descriptiveKeywords) {
            if (otherVarLower.includes(keyword)) {
              currentScore = Math.max(currentScore, descriptiveKeywords[keyword]);
            }
          }
          
          // Bonus si la variable est simplement "label", "name", "title"
          if (['label', 'name', 'title'].includes(otherVarLower)) currentScore += 2;

          if (currentScore > bestOtherLabelScore) {
            bestOtherLabelScore = currentScore;
            bestOtherLabel = otherVarBinding.value;
          } else if (currentScore === bestOtherLabelScore && bestOtherLabel && otherVarBinding.value.length < bestOtherLabel.length) {
            // En cas d'égalité de score, préférer le label le plus court (moins verbeux)
            bestOtherLabel = otherVarBinding.value;
          }
        }
      }

      if (bestOtherLabel) {
        return bestOtherLabel;
      }
    }

    // Priorité 4: Identifiant extrait.
    return defaultId;
  }
  
  /**
   * Transforme les résultats SPARQL en format compatible avec le graphe
   */
  transformSparqlResults(results) {
    if (!results.results || !results.results.bindings || results.results.bindings.length === 0) {
      console.warn("Résultats SPARQL vides ou invalides");
      return { nodes: [], links: [] };
    }
    
    const nodesMap = new Map();
    const linksMap = new Map();
    
    const vars = results.head.vars;
    console.log("Variables SPARQL disponibles:", vars);
    
    const sourceVar = vars[0];
    const targetVar = vars.length > 1 ? vars[1] : null;
    
    results.results.bindings.forEach(binding => {
      if (binding[sourceVar]) {
        const sourceId = this.extractIdFromBinding(binding[sourceVar]);
        const sourceLabel = this._determineNodeLabelFromBinding(binding[sourceVar], sourceVar, binding, vars);
        const sourceUri = binding[sourceVar].type === 'uri' ? binding[sourceVar].value : null;
        
        if (!nodesMap.has(sourceId)) {
          nodesMap.set(sourceId, {
            id: sourceId,
            label: sourceLabel,
            uri: sourceUri,
            originalData: { ...binding }
          });
        }
        
        if (targetVar && binding[targetVar]) {
          const targetId = this.extractIdFromBinding(binding[targetVar]);
          const targetLabel = this._determineNodeLabelFromBinding(binding[targetVar], targetVar, binding, vars);
          const targetUri = binding[targetVar].type === 'uri' ? binding[targetVar].value : null;
          
          if (!nodesMap.has(targetId)) {
            nodesMap.set(targetId, {
              id: targetId,
              label: targetLabel,
              uri: targetUri,
              originalData: { ...binding }
            });
          }
          
          const linkKey = `${sourceId}-${targetId}`;
          if (!linksMap.has(linkKey)) {
            linksMap.set(linkKey, {
              source: sourceId,
              target: targetId
            });
          }
        }
      }
    });
    
    return {
      nodes: Array.from(nodesMap.values()),
      links: Array.from(linksMap.values())
    };
  }
  
  /**
   * Extrait un identifiant d'un binding SPARQL
   */
  extractIdFromBinding(binding) {
    if (!binding) return "unknown";
    // Si la valeur liée est un littéral, sa "valeur" est son identifiant pour l'affichage si aucun autre label n'est trouvé.
    if (binding.type === 'literal') return binding.value;

    const value = binding.value;
    if (!value) return "unknown";

    // Gestion spécifique pour les liens OMA gateway.pl
    if (value.includes('gateway.pl') && value.includes('p1=')) {
      try {
        // Essayer d'extraire p1 proprement avec URLSearchParams
        // Il faut une base si l'URL est relative, mais ici on attend des URI complètes.
        const urlObj = new URL(value);
        const params = new URLSearchParams(urlObj.search);
        if (params.has('p1')) {
          return params.get('p1');
        }
      } catch (e) {
        // En cas d'échec du parsing d'URL (ex: URI malformée), tenter une extraction par regex
        const regexMatch = value.match(/p1=([^&]+)/);
        if (regexMatch && regexMatch[1]) {
          return regexMatch[1];
        }
      }
    }

    // Extraction générique par split sur / et #
    const parts = value.split(/[/#]/);
    let lastPart = parts.pop(); 

    // Si la dernière partie contient encore des paramètres query (ex: ?foo=bar), les enlever.
    if (lastPart && lastPart.includes('?')) {
        lastPart = lastPart.split('?')[0];
    }
    // Si lastPart est vide (ex: URI se terminant par /), essayer de prendre l'avant-dernière partie si elle existe.
    if (!lastPart && parts.length > 0) {
        lastPart = parts.pop();
    }

    return lastPart || value; // Retourner la dernière partie, ou la valeur originale en dernier recours.
  }

  /**
   * Exécute une requête SPARQL détaillée pour un nœud spécifique avec hiérarchie
   */
  async executeNodeQuery(node) {
    if (!node || !node.uri) {
      console.error("[vis-graph] ❌ Aucun URI disponible pour ce nœud");
      this.showNotification("Ce nœud n'a pas d'URI associé", 'error');
      return;
    }
    
    try {
      console.log(`[vis-graph] 🔍 Récupération des détails pour ${node.label}...`);
      this.showNotification(`Récupération des détails pour ${node.label}...`);
      
      const endpoint = this.currentEndpoint || this.getAttribute('endpoint') || 'https://dbpedia.org/sparql';
      const proxyUrl = this.currentProxyUrl || this.getAttribute('proxy-url'); // Récupérer URL du proxy
      const queries = this.buildInformativeQueries(node.uri);
      
      let allData = {
        descriptive: null,
        technical: null,
        relationships: null
      };
      
      console.log(`[vis-graph] Requêtes pour les détails du nœud ${node.label} (URI: ${node.uri}) sur l'endpoint: ${endpoint}`);
      if (proxyUrl) {
        console.log(`[vis-graph] URL du proxy configurée: ${proxyUrl}`);
      }

      for (const [queryType, queryContent] of Object.entries(queries)) {
        console.log(`[vis-graph] Exécution de la requête de type "${queryType}"`);
        console.log(`[vis-graph] Contenu de la requête ${queryType}:\n${queryContent}`);
        try {
          // Utiliser le sparqlFetcher avec hiérarchie endpoint > proxy
          const data = await this.sparqlFetcher.executeSparqlQueryWithFallback(
            endpoint, 
            queryContent,
            proxyUrl,
            () => this.showProxyErrorPanel(),
            (message, type) => this.showNotification(message, type)
          );
          allData[queryType] = data;
          console.log(`[vis-graph] ✅ Succès pour la requête ${queryType}`);
        } catch (error) {
          console.warn(`[vis-graph] ⚠️ Erreur pour la requête ${queryType}:`, error.message);
          this.showNotification(`Erreur lors de la récupération des données de type ${queryType}.`, 'error');
        }
      }
      
      this.displayRichNodeDetails(node, allData);
      return { status: 'success', data: allData };

    } catch (error) {
      console.error('[vis-graph] ❌ Erreur majeure lors de la récupération des détails du nœud:', error.message);
      this.showNotification(`Erreur: ${error.message}`, 'error');
      this.displayBasicNodeDetails(node); // Fallback
      return { status: 'error', message: error.message };
    }
  }
  
  /**
   * Construit des requêtes SPARQL informatives selon le type d'URI
   */
  buildInformativeQueries(uri) {
    const queries = {};
    
    // Requête pour informations descriptives (labels, définitions, commentaires)
    queries.descriptive = `
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      PREFIX dc: <http://purl.org/dc/elements/1.1/>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      PREFIX foaf: <http://xmlns.com/foaf/0.1/>
      
      SELECT DISTINCT ?property ?value ?lang
      WHERE {
        <${uri}> ?property ?value .
        
        FILTER (
          ?property = rdfs:label ||
          ?property = rdfs:comment ||
          ?property = skos:prefLabel ||
          ?property = skos:altLabel ||
          ?property = skos:definition ||
          ?property = skos:note ||
          ?property = dc:title ||
          ?property = dcterms:title ||
          ?property = dc:description ||
          ?property = dcterms:description ||
          ?property = foaf:name
        )
        
        BIND(LANG(?value) as ?lang)
      }
      ORDER BY ?property
      LIMIT 100
    `;
    
    // Requête pour relations sémantiques
    queries.relationships = `
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX owl: <http://www.w3.org/2002/07/owl#>
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      
      SELECT DISTINCT ?property ?value ?valueLabel
      WHERE {
        <${uri}> ?property ?value .
        
        FILTER (
          ?property = rdfs:subClassOf ||
          ?property = rdf:type ||
          ?property = skos:broader ||
          ?property = skos:narrower ||
          ?property = skos:related ||
          ?property = owl:sameAs ||
          ?property = owl:equivalentClass ||
          ?property = rdfs:seeAlso ||
          ?property = dcterms:isPartOf ||
          ?property = dcterms:hasPart
        )
        
        OPTIONAL {
          ?value rdfs:label ?valueLabel .
          FILTER(LANG(?valueLabel) = "" || LANGMATCHES(LANG(?valueLabel), "en") || LANGMATCHES(LANG(?valueLabel), "fr"))
        }
        OPTIONAL {
            ?value skos:prefLabel ?prefLabel .
            FILTER(LANG(?prefLabel) = "" || LANGMATCHES(LANG(?prefLabel), "en") || LANGMATCHES(LANG(?prefLabel), "fr"))
        }
        BIND(COALESCE(?valueLabel, ?prefLabel, "") AS ?valueLabel)

      }
      ORDER BY ?property
      LIMIT 50
    `;
    
    // Requête pour propriétés techniques et métadonnées
    queries.technical = `
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX owl: <http://www.w3.org/2002/07/owl#>
      PREFIX dc: <http://purl.org/dc/elements/1.1/>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      PREFIX foaf: <http://xmlns.com/foaf/0.1/>
      
      SELECT DISTINCT ?property ?value ?valueType
      WHERE {
        <${uri}> ?property ?value .
        
        FILTER (
          ?property != rdfs:label &&
          ?property != rdfs:comment &&
          ?property != skos:prefLabel &&
          ?property != skos:altLabel &&
          ?property != skos:definition &&
          ?property != skos:note &&
          ?property != dc:title &&
          ?property != dcterms:title &&
          ?property != dc:description &&
          ?property != dcterms:description &&
          ?property != foaf:name &&
          ?property != rdfs:subClassOf &&
          ?property != rdf:type &&
          ?property != skos:broader &&
          ?property != skos:narrower &&
          ?property != skos:related &&
          ?property != owl:sameAs &&
          ?property != owl:equivalentClass &&
          ?property != rdfs:seeAlso &&
          ?property != dcterms:isPartOf &&
          ?property != dcterms:hasPart
        )
        
        BIND(
          IF(isLiteral(?value), "literal",
            IF(isURI(?value), "uri", "unknown")
          ) AS ?valueType
        )
      }
      ORDER BY ?property
      LIMIT 150
    `;
    
    return queries;
  }
  
  /**
   * Affiche les détails riches d'un nœud
   */
  displayRichNodeDetails(node, allData) {
    const oldPanel = this.shadowRoot.querySelector('.node-details-panel');
    if (oldPanel) {
      oldPanel.remove();
    }
    
    const panel = document.createElement('div');
    panel.className = 'node-details-panel';
    
    // En-tête
    const header = document.createElement('div');
    header.className = 'panel-header';
    
    const title = document.createElement('h2');
    title.textContent = node.label;
    title.style.margin = '0';
    title.style.fontSize = '18px';
    title.style.fontWeight = 'bold';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.className = 'close-btn';
    closeBtn.addEventListener('click', () => panel.remove());
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);
    
    // Contenu principal
    const content = document.createElement('div');
    content.className = 'panel-content';
    
    // Section informations de base (toujours affichée)
    this.addBasicInfoSection(content, node);
    
    // Section contexte du graphe (à partir des données originales du graphe)
    this.addGraphContextSection(content, node);
    
    // Section informations descriptives complètes
    if (allData.descriptive && allData.descriptive.results && allData.descriptive.results.bindings.length > 0) {
      this.addCompleteDescriptiveSection(content, allData.descriptive.results.bindings);
    }
    
    // Section relations complètes avec détails
    if (allData.relationships && allData.relationships.results && allData.relationships.results.bindings.length > 0) {
      this.addCompleteRelationshipsSection(content, allData.relationships.results.bindings);
    }
    
    // Section propriétés techniques complètes
    if (allData.technical && allData.technical.results && allData.technical.results.bindings.length > 0) {
      this.addCompleteTechnicalSection(content, allData.technical.results.bindings);
    }
    
    // Résumé des données récupérées
    this.addDataSummary(content, allData);
    
    panel.appendChild(content);
    this.shadowRoot.querySelector('.graph-container').appendChild(panel);
  }
  
  /**
   * Ajoute une section d'informations de base
   */
  addBasicInfoSection(container, node) {
    const section = document.createElement('div');
    section.className = 'info-section';
    section.style.marginBottom = '20px';
    
    const title = document.createElement('h3');
    title.textContent = 'Basic Information';
    title.style.borderBottom = '2px solid #007cba';
    title.style.paddingBottom = '5px';
    title.style.marginBottom = '15px';
    section.appendChild(title);
    
    this.addDetailedInfoRow(section, 'Label', node.label);
    this.addDetailedInfoRow(section, 'URI', node.uri, true);
    this.addDetailedInfoRow(section, 'Accession', this.extractAccessionFromURI(node.uri));
    
    const connections = this.links.filter(l => 
      l.source.id === node.id || l.target.id === node.id
    ).length;
    this.addDetailedInfoRow(section, 'Connections in Graph', connections.toString());
    
    container.appendChild(section);
  }
  
  /**
   * Ajoute une section de contexte du graphe basée sur les données originales.
   */
  addGraphContextSection(container, node) {
    if (!node.originalData) return;

    const graphContextInfo = this.extractGraphContext(node);
    if (graphContextInfo.length === 0) return;

    const section = document.createElement('div');
    section.className = 'info-section';
    section.style.marginBottom = '20px';
    
    const title = document.createElement('h3');
    title.textContent = 'Graph Context (from original data)';
    title.style.borderBottom = '2px solid #17a2b8';
    title.style.paddingBottom = '5px';
    title.style.marginBottom = '15px';
    section.appendChild(title);
    
    graphContextInfo.forEach(info => {
      this.addDetailedInfoRow(section, info.type, info.value, info.isUri);
    });
    
    container.appendChild(section);
  }
  
  /**
   * Extrait le contexte du graphe d'un nœud à partir de ses données originales.
   */
  extractGraphContext(node) {
    const context = [];
    if (!node.originalData || !this.sparqlData || !this.sparqlData.head || !this.sparqlData.head.vars) {
      return context;
    }

    const mainSparqlVars = this.sparqlData.head.vars;
    const sourceVar = mainSparqlVars[0];
    const targetVar = mainSparqlVars.length > 1 ? mainSparqlVars[1] : null;

    // Identifier les variables qui pourraient être des labels déjà utilisés pour le nœud principal
    // (pour éviter de les répéter dans le contexte)
    const potentialLabelVars = mainSparqlVars.filter(v => 
        v.toLowerCase().includes('label') || 
        v.toLowerCase().includes('name') || 
        v.toLowerCase().includes('title')
    );

    for (const [key, valueObj] of Object.entries(node.originalData)) {
      // Exclure les variables principales (source, target) et les variables de label probables
      // ainsi que les "meta-variables" comme type et lang qui sont attachées aux valeurs elles-mêmes.
      if (key !== sourceVar && 
          key !== targetVar && 
          !potentialLabelVars.includes(key) &&
          key !== 'type' && key !== 'lang' && // Clés ajoutées par SPARQL JSON pour le type/lang de la valeur
          valueObj && typeof valueObj.value !== 'undefined') { 
        
        context.push({
          type: this.getReadablePropertyName(key), 
          value: valueObj.value,
          isUri: valueObj.type === 'uri'
        });
      }
    }
    
    return context;
  }
  
  /**
   * Ajoute la section informations descriptives complètes
   */
  addCompleteDescriptiveSection(container, bindings) {
    const section = document.createElement('div');
    section.className = 'info-section';
    section.style.marginBottom = '20px';
    
    const title = document.createElement('h3');
    title.textContent = `Descriptive Information (${bindings.length} properties)`;
    title.style.borderBottom = '2px solid #28a745';
    title.style.paddingBottom = '5px';
    title.style.marginBottom = '15px';
    section.appendChild(title);
    
    bindings.forEach((binding, index) => {
      const propContainer = document.createElement('div');
      propContainer.style.marginBottom = '15px';
      propContainer.style.padding = '12px';
      propContainer.style.border = '1px solid #dee2e6';
      propContainer.style.borderRadius = '5px';
      propContainer.style.backgroundColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
      
      // Nom de la propriété
      const propHeader = document.createElement('div');
      propHeader.style.display = 'flex';
      propHeader.style.justifyContent = 'space-between';
      propHeader.style.alignItems = 'center';
      propHeader.style.marginBottom = '8px';
      
      const propName = document.createElement('strong');
      propName.textContent = this.getReadablePropertyName(binding.property.value);
      propName.style.color = '#495057';
      propName.style.fontSize = '14px';
      propHeader.appendChild(propName);
      
      const propType = document.createElement('span');
      propType.textContent = binding.lang && binding.lang.value ? `[${binding.lang.value}]` : '[text]';
      propType.style.fontSize = '11px';
      propType.style.color = '#6c757d';
      propType.style.backgroundColor = '#e9ecef';
      propType.style.padding = '2px 6px';
      propType.style.borderRadius = '3px';
      propHeader.appendChild(propType);
      
      propContainer.appendChild(propHeader);
      
      // URI de la propriété
      const propUri = document.createElement('div');
      propUri.style.fontSize = '11px';
      propUri.style.color = '#6c757d';
      propUri.style.marginBottom = '8px';
      propUri.style.wordBreak = 'break-all';
      propUri.innerHTML = `Property URI: <a href="${binding.property.value}" target="_blank" style="color: #007cba;">${binding.property.value}</a>`;
      propContainer.appendChild(propUri);
      
      // Valeur
      const valueDiv = document.createElement('div');
      valueDiv.style.color = '#212529';
      valueDiv.style.fontSize = '13px';
      valueDiv.style.lineHeight = '1.5';
      valueDiv.style.padding = '8px';
      valueDiv.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
      valueDiv.style.borderRadius = '3px';
      valueDiv.style.wordBreak = 'break-word';
      valueDiv.textContent = binding.value.value;
      propContainer.appendChild(valueDiv);
      
      section.appendChild(propContainer);
    });
    
    container.appendChild(section);
  }
  
  /**
   * Ajoute la section relations complètes avec détails
   */
  addCompleteRelationshipsSection(container, bindings) {
    // Déduplication des relations basée sur propriété + valeur cible
    const uniqueRelations = new Map();
    bindings.forEach(binding => {
      const key = `${binding.property.value}|${binding.value.value}`;
      if (!uniqueRelations.has(key)) {
        uniqueRelations.set(key, binding);
      }
    });
    const deduplicatedBindings = Array.from(uniqueRelations.values());
    
    console.log(`[vis-graph] Déduplication des relations: ${bindings.length} → ${deduplicatedBindings.length}`);
    
    const section = document.createElement('div');
    section.className = 'info-section';
    section.style.marginBottom = '20px';
    
    const title = document.createElement('h3');
    title.textContent = `Relationships & Classifications (${deduplicatedBindings.length} relations)`;
    title.style.borderBottom = '2px solid #ffc107';
    title.style.paddingBottom = '5px';
    title.style.marginBottom = '15px';
    section.appendChild(title);
    
    // Expliquer la différence avec les connexions du graphe
    const explanation = document.createElement('div');
    explanation.style.backgroundColor = '#fff3cd';
    explanation.style.border = '1px solid #ffeaa7';
    explanation.style.borderRadius = '4px';
    explanation.style.padding = '8px';
    explanation.style.marginBottom = '15px';
    explanation.style.fontSize = '12px';
    explanation.innerHTML = `
      <strong>ℹ️ Note:</strong> These are <strong>semantic relationships</strong> from ontologies (what this term IS), 
      different from the <strong>graph connections</strong> (which entities are associated with this term in your data).
    `;
    section.appendChild(explanation);
    
    deduplicatedBindings.forEach((binding, index) => {
      const relationContainer = document.createElement('div');
      relationContainer.style.marginBottom = '15px';
      relationContainer.style.padding = '12px';
      relationContainer.style.border = '1px solid #ffc107';
      relationContainer.style.borderRadius = '5px';
      relationContainer.style.backgroundColor = index % 2 === 0 ? '#fff8e1' : '#ffffff';
      
      // Type de relation avec explication
      const relationHeader = document.createElement('div');
      relationHeader.style.display = 'flex';
      relationHeader.style.justifyContent = 'space-between';
      relationHeader.style.alignItems = 'center';
      relationHeader.style.marginBottom = '8px';
      
      const relationType = document.createElement('strong');
      relationType.textContent = this.getReadablePropertyName(binding.property.value);
      relationType.style.color = '#856404';
      relationType.style.fontSize = '14px';
      relationHeader.appendChild(relationType);
      
      const relationBadge = document.createElement('span');
      relationBadge.textContent = '[SEMANTIC]';
      relationBadge.style.fontSize = '10px';
      relationBadge.style.color = '#856404';
      relationBadge.style.backgroundColor = '#ffc107';
      relationBadge.style.padding = '2px 6px';
      relationBadge.style.borderRadius = '3px';
      relationHeader.appendChild(relationBadge);
      
      relationContainer.appendChild(relationHeader);
      
      // URI de la propriété de relation
      const propUri = document.createElement('div');
      propUri.style.fontSize = '11px';
      propUri.style.color = '#6c757d';
      propUri.style.marginBottom = '8px';
      propUri.style.wordBreak = 'break-all';
      propUri.innerHTML = `Relation URI: <a href="${binding.property.value}" target="_blank" style="color: #007cba;">${binding.property.value}</a>`;
      relationContainer.appendChild(propUri);
      
      // Entité liée
      const targetContainer = document.createElement('div');
      targetContainer.style.padding = '10px';
      targetContainer.style.backgroundColor = 'rgba(255, 193, 7, 0.1)';
      targetContainer.style.borderRadius = '4px';
      targetContainer.style.border = '1px solid rgba(255, 193, 7, 0.3)';
      
      // Label de l'entité liée (si disponible)
      if (binding.valueLabel && binding.valueLabel.value) {
        const targetLabel = document.createElement('div');
        targetLabel.style.fontWeight = 'bold';
        targetLabel.style.color = '#212529';
        targetLabel.style.fontSize = '14px';
        targetLabel.style.marginBottom = '6px';
        targetLabel.textContent = `➤ ${binding.valueLabel.value}`;
        targetContainer.appendChild(targetLabel);
        
        const ontologySourceText = this.getSimpleOntologySource(binding.value.value);
        if (ontologySourceText) {
          const sourceDiv = document.createElement('div');
          sourceDiv.style.fontSize = '11px';
          sourceDiv.style.color = '#6c757d';
          sourceDiv.style.marginBottom = '6px';
          sourceDiv.innerHTML = `📚 <strong>Source:</strong> ${ontologySourceText}`;
          targetContainer.appendChild(sourceDiv);
        }
      }
      
      // URI de l'entité liée
      const targetUri = document.createElement('div');
      targetUri.style.fontSize = '11px';
      targetUri.style.color = '#495057';
      targetUri.style.wordBreak = 'break-all';
      targetUri.innerHTML = `🔗 Target URI: <a href="${binding.value.value}" target="_blank" style="color: #007cba;">${binding.value.value}</a>`;
      targetContainer.appendChild(targetUri);
      
      relationContainer.appendChild(targetContainer);
      section.appendChild(relationContainer);
    });
    
    container.appendChild(section);
  }
  
  /**
   * Extrait une information de source simplifiée depuis une URI (domaine ou préfixe connu).
   */
  getSimpleOntologySource(uri) {
    if (!uri || typeof uri !== 'string') return 'Unknown Source';

    // Priorité aux préfixes bien connus pour les ontologies courantes
    const knownPrefixes = {
      'http://www.w3.org/1999/02/22-rdf-syntax-ns#': 'RDF',
      'http://www.w3.org/2000/01/rdf-schema#': 'RDFS',
      'http://www.w3.org/2002/07/owl#': 'OWL',
      'http://www.w3.org/2004/02/skos/core#': 'SKOS',
      'http://purl.org/dc/elements/1.1/': 'DC',
      'http://purl.org/dc/terms/': 'DCTERMS',
      'http://xmlns.com/foaf/0.1/': 'FOAF',
      'http://purl.obolibrary.org/obo/GO_': 'GO (OBO)',       // Gene Ontology
      'http://purl.obolibrary.org/obo/DOID_': 'DOID (OBO)',   // Human Disease Ontology
      'http://purl.obolibrary.org/obo/CHEBI_': 'ChEBI (OBO)', // Chemical Entities of Biological Interest
      'http://purl.obolibrary.org/obo/CL_': 'CL (OBO)',       // Cell Ontology
      'http://purl.obolibrary.org/obo/PR_': 'PRO (OBO)',      // Protein Ontology
      'http://purl.obolibrary.org/obo/UBERON_': 'Uberon (OBO)', // Uber-anatomy ontology
      'http://purl.obolibrary.org/obo/SO_': 'SO (OBO)',       // Sequence Ontology
      'http://purl.obolibrary.org/obo/NCBITaxon_': 'NCBI Taxonomy (OBO)',
      'http://purl.obolibrary.org/obo/RO_': 'RO (OBO)', // Relations Ontology
      'http://purl.obolibrary.org/obo/BFO_': 'BFO (OBO)', // Basic Formal Ontology
      'http://purl.uniprot.org/core/': 'UniProt Core',
      'http://rdf.ebi.ac.uk/terms/ensembl/' : 'Ensembl (EBI)',
      'http://www.ebi.ac.uk/ols/ontologies/': 'OLS (EBI)'
    };

    for (const prefix in knownPrefixes) {
      if (uri.startsWith(prefix)) {
        return knownPrefixes[prefix];
      }
    }

    // Si aucun préfixe connu, essayer d'extraire le nom de domaine
    try {
      const url = new URL(uri);
      // Cas spécifique pour purl.obolibrary.org si non capturé par préfixe direct
      if (url.hostname === 'purl.obolibrary.org' && url.pathname.startsWith('/obo/')) {
        const pathParts = url.pathname.split('/');
        if (pathParts.length > 2 && pathParts[1] === 'obo') {
            const oboTermPart = pathParts[2];
            const oboNamespace = oboTermPart.split('_')[0];
            if (oboNamespace) return `${oboNamespace.toUpperCase()} (OBO Library)`;
        }
        return 'OBO Library';
      }
      return url.hostname; // Retourne le nom de domaine comme source générique
    } catch (error) {
      // En cas d'URI invalide ou relative (peu probable ici car on attend une URI de ?value)
      // Tenter une extraction simple du "namespace" avant le # ou le dernier /
      const hashIndex = uri.lastIndexOf('#');
      if (hashIndex > 0) {
        const potentialNs = uri.substring(0, hashIndex);
        if (potentialNs.length > 5) return potentialNs; // Éviter les "http:"
      }
      const slashIndex = uri.lastIndexOf('/');
      if (slashIndex > 0) {
        const potentialNs = uri.substring(0, slashIndex);
        if (potentialNs.length > 5 && potentialNs.includes(':/')) return potentialNs;
      }
      return 'Unknown Source'; // Fallback final
    }
  }

  /**
   * Ajoute la section propriétés techniques complètes
   */
  addCompleteTechnicalSection(container, bindings) {
    const section = document.createElement('div');
    section.className = 'info-section';
    section.style.marginBottom = '20px';
    
    const titleContainer = document.createElement('div');
    titleContainer.style.cursor = 'pointer';
    titleContainer.style.borderBottom = '2px solid #6c757d';
    titleContainer.style.paddingBottom = '5px';
    titleContainer.style.marginBottom = '15px';
    
    const title = document.createElement('h3');
    title.textContent = `▼ Technical Properties (${bindings.length} properties)`;
    title.style.margin = '0';
    titleContainer.appendChild(title);
    
    const content = document.createElement('div');
    content.className = 'technical-content';
    content.style.display = 'none';
    
    bindings.forEach((binding, index) => {
      const propContainer = document.createElement('div');
      propContainer.style.marginBottom = '12px';
      propContainer.style.padding = '10px';
      propContainer.style.border = '1px solid #dee2e6';
      propContainer.style.borderRadius = '4px';
      propContainer.style.backgroundColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
      
      // En-tête de la propriété technique
      const propHeader = document.createElement('div');
      propHeader.style.display = 'flex';
      propHeader.style.justifyContent = 'space-between';
      propHeader.style.alignItems = 'center';
      propHeader.style.marginBottom = '6px';
      
      const propName = document.createElement('strong');
      propName.textContent = binding.property.value.split(/[/#]/).pop();
      propName.style.fontSize = '12px';
      propName.style.color = '#495057';
      propHeader.appendChild(propName);
      
      const valueType = binding.valueType ? binding.valueType.value : 'unknown';
      const typeBadge = document.createElement('span');
      typeBadge.textContent = valueType.toUpperCase();
      typeBadge.style.fontSize = '9px';
      typeBadge.style.color = valueType === 'uri' ? '#007cba' : '#28a745';
      typeBadge.style.backgroundColor = valueType === 'uri' ? '#e3f2fd' : '#e8f5e9';
      typeBadge.style.padding = '2px 4px';
      typeBadge.style.borderRadius = '2px';
      propHeader.appendChild(typeBadge);
      
      propContainer.appendChild(propHeader);
      
      // URI complète de la propriété
      const fullPropUri = document.createElement('div');
      fullPropUri.style.fontSize = '10px';
      fullPropUri.style.color = '#6c757d';
      fullPropUri.style.marginBottom = '6px';
      fullPropUri.style.wordBreak = 'break-all';
      fullPropUri.innerHTML = `<a href="${binding.property.value}" target="_blank" style="color: #6c757d;">${binding.property.value}</a>`;
      propContainer.appendChild(fullPropUri);
      
      // Valeur
      const valueDiv = document.createElement('div');
      valueDiv.style.fontSize = '11px';
      valueDiv.style.padding = '6px';
      valueDiv.style.backgroundColor = '#f8f9fa';
      valueDiv.style.borderRadius = '3px';
      valueDiv.style.wordBreak = 'break-all';
      
      if (valueType === 'uri') {
        valueDiv.innerHTML = `<a href="${binding.value.value}" target="_blank" style="color: #007cba;">${binding.value.value}</a>`;
    } else {
        valueDiv.textContent = binding.value.value;
      }
      
      propContainer.appendChild(valueDiv);
      content.appendChild(propContainer);
    });
    
    // Toggle functionality
    titleContainer.addEventListener('click', () => {
      const isVisible = content.style.display !== 'none';
      content.style.display = isVisible ? 'none' : 'block';
      title.textContent = `${isVisible ? '▶' : '▼'} Technical Properties (${bindings.length} properties)`;
    });
    
    section.appendChild(titleContainer);
    section.appendChild(content);
    container.appendChild(section);
  }
  
  /**
   * Ajoute un résumé des données récupérées
   */
  addDataSummary(container, allData) {
    const section = document.createElement('div');
    section.className = 'info-section';
    section.style.marginTop = '20px';
    section.style.padding = '10px';
    section.style.backgroundColor = '#e9ecef';
    section.style.borderRadius = '5px';
    
    const title = document.createElement('h4');
    title.textContent = 'Data Retrieval Summary';
    title.style.color = '#495057';
    title.style.marginBottom = '8px';
    section.appendChild(title);
    
    const summary = document.createElement('div');
    summary.style.fontSize = '12px';
    summary.style.color = '#6c757d';
    
    const descriptiveCount = allData.descriptive && allData.descriptive.results ? allData.descriptive.results.bindings.length : 0;
    const relationshipsCount = allData.relationships && allData.relationships.results ? allData.relationships.results.bindings.length : 0;
    const technicalCount = allData.technical && allData.technical.results ? allData.technical.results.bindings.length : 0;
    const totalCount = descriptiveCount + relationshipsCount + technicalCount;
    
    summary.innerHTML = `
      • <strong>${descriptiveCount}</strong> descriptive properties retrieved<br>
      • <strong>${relationshipsCount}</strong> relationships found<br>
      • <strong>${technicalCount}</strong> technical properties collected<br>
      • <strong>${totalCount}</strong> total properties from API<br>
      • Endpoint: <code>${this.currentEndpoint || 'default'}</code>
    `;
    
    section.appendChild(summary);
    container.appendChild(section);
  }
  
  /**
   * Ajoute une ligne d'information détaillée
   */
  addDetailedInfoRow(container, label, value, isLink = false) {
    if (!value || value === 'None' || value === '') return;
    
    const row = document.createElement('div');
    row.style.marginBottom = '10px';
    row.style.display = 'flex';
    row.style.flexDirection = 'column';
    
    const labelElement = document.createElement('strong');
    labelElement.textContent = label;
    labelElement.style.color = '#2c3e50';
    labelElement.style.fontSize = '13px';
    labelElement.style.marginBottom = '3px';
    row.appendChild(labelElement);
    
    const valueElement = document.createElement('div');
    valueElement.style.paddingLeft = '12px';
    valueElement.style.color = '#34495e';
    valueElement.style.fontSize = '12px';
    valueElement.style.lineHeight = '1.4';
    valueElement.style.wordBreak = 'break-all';
    
    if (isLink && typeof value === 'string' && value.startsWith('http')) {
      const link = document.createElement('a');
      link.href = value;
      link.target = '_blank';
      link.textContent = value;
      link.style.color = '#007cba';
      link.style.textDecoration = 'underline';
      valueElement.appendChild(link);
    } else {
      valueElement.textContent = value;
    }
    
    row.appendChild(valueElement);
    container.appendChild(row);
  }

  /**
   * Extrait l'identifiant d'accession depuis une URI
   */
  extractAccessionFromURI(uri) {
    if (!uri) return 'N/A';
    
    // Pour d'autres ontologies
    const oboMatch = uri.match(/([A-Z]+)_(\d+)/);
    if (oboMatch) {
      return `${oboMatch[1]}:${oboMatch[2]}`;
    }
    
    // Retourner la dernière partie de l'URI
    return uri.split(/[/#]/).pop();
  }

  /**
   * Obtient un nom lisible pour une propriété
   */
  getReadablePropertyName(propUri) {
    const mappings = {
      'subClassOf': 'Is a type of',
      'type': 'Type',
      'broader': 'Broader concept',
      'narrower': 'Narrower concept', 
      'related': 'Related to',
      'sameAs': 'Same as',
      'equivalentClass': 'Equivalent to',
      'BFO_0000050': 'Part of',
      'RO_0002211': 'Regulates',
      'RO_0002212': 'Negatively regulates',
      'RO_0002213': 'Positively regulates',
      'label': 'Label',
      'comment': 'Comment',
      'definition': 'Definition',
      'hasDefinition': 'Definition',
      'hasExactSynonym': 'Exact Synonym',
      'hasRelatedSynonym': 'Related Synonym',
      'hasBroadSynonym': 'Broad Synonym',
      'hasNarrowSynonym': 'Narrow Synonym',
      'prefLabel': 'Preferred Label',
      'altLabel': 'Alternative Label',
      'title': 'Title',
      'description': 'Description',
      'id': 'ID'
    };
    
    const shortName = propUri.split(/[/#]/).pop();
    return mappings[shortName] || shortName.replace(/_/g, ' ');
  }

  /**
   * Affiche les détails de base d'un nœud
   */
  displayBasicNodeDetails(node, container = null) {
    // Supprimer l'ancien panneau s'il existe
    const oldPanel = this.shadowRoot.querySelector('.node-details-panel');
    if (oldPanel) {
      oldPanel.remove();
    }
    
    // Créer un nouveau panneau
    const panel = document.createElement('div');
    panel.className = 'node-details-panel';
    
    // En-tête
    const header = document.createElement('div');
    header.className = 'panel-header';
    
    const title = document.createElement('h2');
    title.textContent = node.label || node.id;
    title.style.margin = '0';
    title.style.fontSize = '18px';
    title.style.fontWeight = 'bold';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.className = 'close-btn';
    closeBtn.addEventListener('click', () => panel.remove());
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);
    
    // Contenu principal
    const content = document.createElement('div');
    content.className = 'panel-content';
    
    const basicInfo = document.createElement('div');
    basicInfo.innerHTML = `
      <h4>Informations disponibles</h4>
      <p><strong>ID:</strong> ${node.id}</p>
      <p><strong>Label:</strong> ${node.label}</p>
      ${node.uri ? `<p><strong>URI:</strong> <a href="${node.uri}" target="_blank">${node.uri}</a></p>` : ''}
    `;
    
    // Connexions
    const connections = this.links.filter(l => 
      l.source.id === node.id || l.target.id === node.id
    ).length;
    
    const connectionsInfo = document.createElement('p');
    connectionsInfo.innerHTML = `<strong>Connexions:</strong> ${connections}`;
    basicInfo.appendChild(connectionsInfo);
    
    content.appendChild(basicInfo);
    panel.appendChild(content);
    
    this.shadowRoot.querySelector('.graph-container').appendChild(panel);
  }
  
  /**
   * Affiche une notification temporaire
   */
  showNotification(message, type = 'info') {
    const oldNotification = this.shadowRoot.querySelector('.notification');
    if (oldNotification) {
      oldNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    this.shadowRoot.querySelector('.graph-container').appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  }

  /**
   * Affiche une infobulle avec les détails d'un nœud
   */
  showTooltip(node, x, y) {
    this.hideTooltip();
    
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
    }
    
    this.tooltipTimeout = setTimeout(() => {
      const tooltip = document.createElement('div');
      tooltip.className = 'tooltip';
      
      const title = document.createElement('h3');
      title.textContent = node.label;
      tooltip.appendChild(title);
      
      if (node.uri) {
        const uri = document.createElement('p');
        uri.innerHTML = `<strong>URI:</strong> ${node.uri}`;
        tooltip.appendChild(uri);
      }
      
      const connections = this.links.filter(l => 
        l.source.id === node.id || l.target.id === node.id
      ).length;
      const connectionsText = document.createElement('p');
      connectionsText.innerHTML = `<strong>Connexions:</strong> ${connections}`;
      tooltip.appendChild(connectionsText);
      
      tooltip.style.left = `${x + 15}px`;
      tooltip.style.top = `${y - 15}px`;
      
      this.shadowRoot.querySelector('.graph-container').appendChild(tooltip);
    }, 200);
  }
  
  /**
   * Cache l'infobulle
   */
  hideTooltip() {
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
    }
    
    const tooltip = this.shadowRoot.querySelector('.tooltip');
    if (tooltip) {
      tooltip.remove();
    }
  }
  
  /**
   * Affiche un menu contextuel pour un nœud
   */
  showContextMenu(node, x, y) {
    const oldMenu = this.shadowRoot.querySelector('.context-menu');
    if (oldMenu) {
      oldMenu.remove();
    }
    
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    
    const queryButton = document.createElement('button');
    queryButton.textContent = 'Récupérer les détails';
    queryButton.addEventListener('click', () => {
      this.executeNodeQuery(node);
      menu.remove();
    });
    menu.appendChild(queryButton);
    
    this.shadowRoot.querySelector('.graph-container').appendChild(menu);
    
    // Ajuster la position si nécessaire
    const container = this.shadowRoot.querySelector('.graph-container');
    const menuRect = menu.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    if (menuRect.right > containerRect.right) {
      menu.style.left = `${x - menuRect.width}px`;
    }
    
    if (menuRect.bottom > containerRect.bottom) {
      menu.style.top = `${y - menuRect.height}px`;
    }
  }

  /**
   * Rend le graphe avec D3.js
   */
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: Arial, sans-serif;
        }
        .graph-container {
          width: ${this.width}px;
          height: ${this.height}px;
          background-color: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }
        svg {
          width: 100%;
          height: 100%;
        }
        .links line {
          stroke: #999;
          stroke-opacity: 0.6;
          transition: stroke 0.3s, stroke-width 0.3s;
        }
        .nodes circle {
          stroke: #fff;
          stroke-width: 1.5px;
          transition: stroke 0.3s, stroke-width 0.3s;
        }
        .node-label {
          font-size: 12px;
          pointer-events: none;
          fill: #333;
          text-anchor: middle;
          dominant-baseline: middle;
        }
        .node-highlighted circle {
          stroke: #ff4444 !important;
          stroke-width: 3px !important;
        }
        .link-highlighted {
          stroke: #ff4444 !important;
          stroke-width: 2px !important;
          stroke-opacity: 1 !important;
        }
        .tooltip {
          position: absolute;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 10px;
          pointer-events: none;
          z-index: 10;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          max-width: 300px;
          font-size: 12px;
        }
        .tooltip h3 {
          margin: 0 0 5px 0;
          font-size: 14px;
        }
        .tooltip p {
          margin: 3px 0;
        }
        .node-details-panel {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 350px;
          max-height: calc(100% - 20px);
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: auto;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          z-index: 5;
          display: flex;
          flex-direction: column;
        }
        .proxy-error-panel {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 380px;
          max-height: calc(100% - 20px);
          background: linear-gradient(135deg, #fff3cd 0%, #fef5e7 100%);
          border: 2px solid #f0ad4e;
          border-radius: 8px;
          overflow: auto;
          box-shadow: 0 4px 12px rgba(240, 173, 78, 0.3);
          z-index: 15;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .error-header {
          padding: 15px;
          background: linear-gradient(135deg, #f0ad4e 0%, #ec971f 100%);
          color: white;
          border-radius: 6px 6px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .error-header h2 {
          margin: 0;
          font-size: 16px;
          font-weight: bold;
        }
        .error-content {
          padding: 20px;
        }
        .error-message {
          margin-bottom: 20px;
          color: #8a6d3b;
          line-height: 1.5;
        }
        .error-message p {
          margin: 10px 0;
        }
        .error-actions {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .doc-button, .console-button {
          padding: 10px 15px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s ease;
          flex: 1;
          min-width: 120px;
        }
        .doc-button {
          background: linear-gradient(135deg, #5bc0de 0%, #31b0d5 100%);
          color: white;
        }
        .doc-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(91, 192, 222, 0.3);
        }
        .console-button {
          background: linear-gradient(135deg, #5cb85c 0%, #449d44 100%);
          color: white;
        }
        .console-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(92, 184, 92, 0.3);
        }
        .quick-solution {
          background: rgba(23, 162, 184, 0.1);
          border: 1px solid rgba(23, 162, 184, 0.3);
          border-radius: 5px;
          padding: 15px;
          margin-top: 15px;
        }
        .quick-solution h4 {
          color: #117a8b;
          margin: 0 0 10px 0;
          font-size: 14px;
        }
        .quick-solution ol {
          margin: 0;
          padding-left: 20px;
          color: #495057;
        }
        .quick-solution li {
          margin: 5px 0;
          font-size: 13px;
        }
        .quick-solution code {
          background: rgba(0, 0, 0, 0.1);
          padding: 2px 5px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          color: #e83e8c;
        }
        .panel-header {
          padding: 10px;
          background: #f0f0f0;
          border-bottom: 1px solid #ddd;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .panel-header h3 {
          margin: 0;
          font-size: 16px;
        }
        .close-btn {
          border: none;
          background: transparent;
          font-size: 20px;
          cursor: pointer;
          padding: 0 5px;
          color: white;
        }
        .close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .node-uri {
          padding: 10px;
          border-bottom: 1px solid #eee;
          font-size: 12px;
          word-break: break-all;
        }
        .panel-content {
          padding: 10px;
          overflow: auto;
        }
        .panel-content table {
          width: 100%;
          border-collapse: collapse;
        }
        .panel-content th,
        .panel-content td {
          text-align: left;
          padding: 5px;
          border-bottom: 1px solid #eee;
          font-size: 12px;
          word-break: break-all;
        }
        .context-menu {
          position: absolute;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          padding: 5px 0;
          z-index: 20;
        }
        .context-menu button {
          display: block;
          width: 100%;
          border: none;
          background: white;
          padding: 8px 15px;
          text-align: left;
          cursor: pointer;
        }
        .context-menu button:hover {
          background: #f0f0f0;
        }
        .notification {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 20px;
          border-radius: 4px;
          z-index: 30;
          transition: opacity 0.5s;
        }
        .notification.info {
          background: #e3f2fd;
          border: 1px solid #2196f3;
        }
        .notification.error {
          background: #ffebee;
          border: 1px solid #f44336;
        }
        .notification.fade-out {
          opacity: 0;
        }
        .proxy-error-panel .error-header { /* Style spécifique pour le header du panneau d'erreur proxy */
          padding: 15px;
          background: linear-gradient(135deg, #f0ad4e 0%, #ec971f 100%);
          color: white;
          border-radius: 6px 6px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .proxy-error-panel .error-header h2 {
          margin: 0;
          font-size: 16px;
          font-weight: bold;
        }
        .proxy-error-panel .error-content {
          padding: 20px;
        }
        .proxy-error-panel .error-message {
          margin-bottom: 20px;
          color: #8a6d3b;
          line-height: 1.5;
        }
        .proxy-error-panel .error-message p {
          margin: 10px 0;
        }
        .proxy-error-panel .error-actions {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .proxy-error-panel .doc-button, .proxy-error-panel .console-button {
          padding: 10px 15px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s ease;
          flex: 1;
          min-width: 120px;
        }
        .proxy-error-panel .doc-button {
          background: linear-gradient(135deg, #5bc0de 0%, #31b0d5 100%);
          color: white;
        }
        .proxy-error-panel .doc-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(91, 192, 222, 0.3);
        }
        .proxy-error-panel .console-button {
          background: linear-gradient(135deg, #5cb85c 0%, #449d44 100%);
          color: white;
        }
        .proxy-error-panel .console-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(92, 184, 92, 0.3);
        }
        .proxy-error-panel .quick-summary { /* Style pour le résumé rapide */
          background: rgba(23, 162, 184, 0.05);
          border: 1px solid rgba(23, 162, 184, 0.2);
          border-radius: 5px;
          padding: 15px;
          margin-top: 15px;
        }
        .proxy-error-panel .quick-summary h4 {
          color: #117a8b;
          margin: 0 0 10px 0;
          font-size: 14px;
        }
        .proxy-error-panel .quick-summary ol {
          margin: 0;
          padding-left: 20px;
          color: #495057;
        }
        .proxy-error-panel .quick-summary li {
          margin: 5px 0;
          font-size: 13px;
        }
        .proxy-error-panel .quick-summary code {
          background: rgba(0, 0, 0, 0.05);
          padding: 2px 5px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          color: #e83e8c;
        }
        .panel-header {
          padding: 10px;
          background: #f0f0f0;
          border-bottom: 1px solid #ddd;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .panel-header h3 {
          margin: 0;
          font-size: 16px;
        }
        .close-btn {
          border: none;
          background: transparent;
          font-size: 20px;
          cursor: pointer;
          padding: 0 5px;
          color: #6c757d; /* Couleur plus neutre pour le bouton de fermeture */
        }
        .close-btn:hover {
          background: rgba(0, 0, 0, 0.1); /* Ajuster pour un fond clair */
          border-radius: 3px;
        }
        .node-uri {
          padding: 10px;
          border-bottom: 1px solid #eee;
          font-size: 12px;
          word-break: break-all;
        }
        .panel-content {
          padding: 10px;
          overflow: auto;
        }
        .panel-content table {
          width: 100%;
          border-collapse: collapse;
        }
        .panel-content th,
        .panel-content td {
          text-align: left;
          padding: 5px;
          border-bottom: 1px solid #eee;
          font-size: 12px;
          word-break: break-all;
        }
        .context-menu {
          position: absolute;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          padding: 5px 0;
          z-index: 20;
        }
        .context-menu button {
          display: block;
          width: 100%;
          border: none;
          background: white;
          padding: 8px 15px;
          text-align: left;
          cursor: pointer;
        }
        .context-menu button:hover {
          background: #f0f0f0;
        }
        .notification {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 20px;
          border-radius: 4px;
          z-index: 30;
          transition: opacity 0.5s;
        }
        .notification.info {
          background: #e3f2fd;
          border: 1px solid #2196f3;
        }
        .notification.error {
          background: #ffebee;
          border: 1px solid #f44336;
        }
        .notification.fade-out {
          opacity: 0;
        }
      </style>
      <div class="graph-container">
        <svg></svg>
      </div>
    `;

    this.createForceGraph();
    this.initGlobalEventHandlers();
  }
  
  /**
   * Initialise les gestionnaires d'événements globaux
   */
  initGlobalEventHandlers() {
    const container = this.shadowRoot.querySelector('.graph-container');
    
    container.addEventListener('click', (event) => {
      const contextMenu = this.shadowRoot.querySelector('.context-menu');
      if (contextMenu) {
        contextMenu.remove();
      }
    });
    
    container.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });
    
    container.addEventListener('mouseleave', () => {
      this.hideTooltip();
    });
  }

  /**
   * Crée une visualisation force-directed avec D3.js
   */
  createForceGraph() {
    const svg = select(this.shadowRoot.querySelector('svg'));
    const width = this.width;
    const height = this.height;
    
    svg.selectAll("*").remove();
    
    if (!this.nodes || this.nodes.length === 0) {
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2 - 20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text("Aucune donnée à visualiser");
        
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2 + 20)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Veuillez saisir un endpoint SPARQL et une requête, puis cliquez sur \"Exécuter\".");
        
      return;
    }

    const nodeConnections = new Map();
    this.nodes.forEach(node => nodeConnections.set(node.id, 0));
    
    this.links.forEach(link => {
      nodeConnections.set(link.source, (nodeConnections.get(link.source) || 0) + 1);
      nodeConnections.set(link.target, (nodeConnections.get(link.target) || 0) + 1);
    });
    
    const getNodeRadius = nodeId => {
      const connections = nodeConnections.get(nodeId);
      return Math.max(8, Math.min(25, 8 + connections * 2));
    };
    
    const simulation$1 = simulation(this.nodes)
      .force('link', link(this.links).id(d => d.id))
      .force('charge', manyBody().strength(-200))
      .force('center', center(width / 2, height / 2))
      .force('collision', collide().radius(d => getNodeRadius(d.id) + 20))
      .force('x', x(width / 2).strength(0.1))
      .force('y', y(height / 2).strength(0.1));

    const constrainNode = (d) => {
      const radius = getNodeRadius(d.id);
      d.x = Math.max(radius, Math.min(width - radius, d.x));
      d.y = Math.max(radius, Math.min(height - radius, d.y));
    };
        
    const link$1 = svg.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(this.links)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-width', 1);
      
    const nodeGroup = svg.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(this.nodes)
      .enter()
      .append('g')
      .call(drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended))
      .on('mouseover', (event, d) => {
        const connectedLinks = this.links.filter(l => 
          l.source.id === d.id || l.target.id === d.id
        );
        
        const connectedNodeIds = new Set(connectedLinks.flatMap(l => 
          [l.source.id, l.target.id]
        ));
        
        link$1.classed('link-highlighted', l => 
          l.source.id === d.id || l.target.id === d.id
        );
        
        nodeGroup.classed('node-highlighted', n => 
          connectedNodeIds.has(n.id)
        );
        
        this.showTooltip(d, event.offsetX, event.offsetY);
      })
      .on('mouseout', () => {
        link$1.classed('link-highlighted', false);
        nodeGroup.classed('node-highlighted', false);
        this.hideTooltip();
      })
      .on('contextmenu', (event, d) => {
        event.preventDefault();
        this.showContextMenu(d, event.offsetX, event.offsetY);
      });
      
    nodeGroup.append('circle')
      .attr('r', d => getNodeRadius(d.id))
      .attr('fill', '#69b3a2');
    
    nodeGroup.append('text')
      .attr('class', 'node-label')
      .text(d => d.label || d.id);
        
    simulation$1.on('tick', () => {
      nodeGroup.each(constrainNode);
      
      link$1
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      
      nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
    });
    
    function dragstarted(event, d) {
      if (!event.active) simulation$1.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event, d) {
      const radius = getNodeRadius(d.id);
      d.fx = Math.max(radius, Math.min(width - radius, event.x));
      d.fy = Math.max(radius, Math.min(height - radius, event.y));
    }
    
    function dragended(event, d) {
      if (!event.active) simulation$1.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }
}

// Enregistrer le composant
customElements.define('vis-graph', VisGraph);

export { VisGraph };
//# sourceMappingURL=vis-graph.esm.js.map
