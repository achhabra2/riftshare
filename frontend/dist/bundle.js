var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    // Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
    // at the end of hydration without touching the remaining nodes.
    let is_hydrating = false;
    function start_hydrating() {
        is_hydrating = true;
    }
    function end_hydrating() {
        is_hydrating = false;
    }
    function upper_bound(low, high, key, value) {
        // Return first index of value larger than input value in the range [low, high)
        while (low < high) {
            const mid = low + ((high - low) >> 1);
            if (key(mid) <= value) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }
    function init_hydrate(target) {
        if (target.hydrate_init)
            return;
        target.hydrate_init = true;
        // We know that all children have claim_order values since the unclaimed have been detached
        const children = target.childNodes;
        /*
        * Reorder claimed children optimally.
        * We can reorder claimed children optimally by finding the longest subsequence of
        * nodes that are already claimed in order and only moving the rest. The longest
        * subsequence subsequence of nodes that are claimed in order can be found by
        * computing the longest increasing subsequence of .claim_order values.
        *
        * This algorithm is optimal in generating the least amount of reorder operations
        * possible.
        *
        * Proof:
        * We know that, given a set of reordering operations, the nodes that do not move
        * always form an increasing subsequence, since they do not move among each other
        * meaning that they must be already ordered among each other. Thus, the maximal
        * set of nodes that do not move form a longest increasing subsequence.
        */
        // Compute longest increasing subsequence
        // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j
        const m = new Int32Array(children.length + 1);
        // Predecessor indices + 1
        const p = new Int32Array(children.length);
        m[0] = -1;
        let longest = 0;
        for (let i = 0; i < children.length; i++) {
            const current = children[i].claim_order;
            // Find the largest subsequence length such that it ends in a value less than our current value
            // upper_bound returns first greater value, so we subtract one
            const seqLen = upper_bound(1, longest + 1, idx => children[m[idx]].claim_order, current) - 1;
            p[i] = m[seqLen] + 1;
            const newLen = seqLen + 1;
            // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
            m[newLen] = i;
            longest = Math.max(newLen, longest);
        }
        // The longest increasing subsequence of nodes (initially reversed)
        const lis = [];
        // The rest of the nodes, nodes that will be moved
        const toMove = [];
        let last = children.length - 1;
        for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
            lis.push(children[cur - 1]);
            for (; last >= cur; last--) {
                toMove.push(children[last]);
            }
            last--;
        }
        for (; last >= 0; last--) {
            toMove.push(children[last]);
        }
        lis.reverse();
        // We sort the nodes being moved to guarantee that their insertion order matches the claim order
        toMove.sort((a, b) => a.claim_order - b.claim_order);
        // Finally, we move the nodes
        for (let i = 0, j = 0; i < toMove.length; i++) {
            while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
                j++;
            }
            const anchor = j < lis.length ? lis[j] : null;
            target.insertBefore(toMove[i], anchor);
        }
    }
    function append(target, node) {
        if (is_hydrating) {
            init_hydrate(target);
            if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentElement !== target))) {
                target.actual_end_child = target.firstChild;
            }
            if (node !== target.actual_end_child) {
                target.insertBefore(node, target.actual_end_child);
            }
            else {
                target.actual_end_child = node.nextSibling;
            }
        }
        else if (node.parentNode !== target) {
            target.appendChild(node);
        }
    }
    function insert(target, node, anchor) {
        if (is_hydrating && !anchor) {
            append(target, node);
        }
        else if (node.parentNode !== target || (anchor && node.nextSibling !== anchor)) {
            target.insertBefore(node, anchor || null);
        }
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                start_hydrating();
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            end_hydrating();
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.3' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function slide(node, { delay = 0, duration = 400, easing = cubicOut } = {}) {
        const style = getComputedStyle(node);
        const opacity = +style.opacity;
        const height = parseFloat(style.height);
        const padding_top = parseFloat(style.paddingTop);
        const padding_bottom = parseFloat(style.paddingBottom);
        const margin_top = parseFloat(style.marginTop);
        const margin_bottom = parseFloat(style.marginBottom);
        const border_top_width = parseFloat(style.borderTopWidth);
        const border_bottom_width = parseFloat(style.borderBottomWidth);
        return {
            delay,
            duration,
            easing,
            css: t => 'overflow: hidden;' +
                `opacity: ${Math.min(t * 20, 1) * opacity};` +
                `height: ${t * height}px;` +
                `padding-top: ${t * padding_top}px;` +
                `padding-bottom: ${t * padding_bottom}px;` +
                `margin-top: ${t * margin_top}px;` +
                `margin-bottom: ${t * margin_bottom}px;` +
                `border-top-width: ${t * border_top_width}px;` +
                `border-bottom-width: ${t * border_bottom_width}px;`
        };
    }

    // @ts-check
    // Cynhyrchwyd y ffeil hon yn awtomatig. PEIDIWCH Â MODIWL
    // This file is automatically generated. DO NOT EDIT
    const go = {
      "main": {
        "App": {
          /**
           * AppInstalledFromPackageManager
           * @returns {Promise<boolean>}  - Go Type: bool
           */
          "AppInstalledFromPackageManager": () => {
            return window.go.main.App.AppInstalledFromPackageManager();
          },
          /**
           * CancelWormholeRequest
           * @returns {Promise<void>} 
           */
          "CancelWormholeRequest": () => {
            return window.go.main.App.CancelWormholeRequest();
          },
          /**
           * ClearSelectedFiles
           * @returns {Promise<void>} 
           */
          "ClearSelectedFiles": () => {
            return window.go.main.App.ClearSelectedFiles();
          },
          /**
           * GetCurrentVersion
           * @returns {Promise<string>}  - Go Type: string
           */
          "GetCurrentVersion": () => {
            return window.go.main.App.GetCurrentVersion();
          },
          /**
           * GetLogPath
           * @returns {Promise<string>}  - Go Type: string
           */
          "GetLogPath": () => {
            return window.go.main.App.GetLogPath();
          },
          /**
           * GetReceivedFile
           * @returns {Promise<string>}  - Go Type: string
           */
          "GetReceivedFile": () => {
            return window.go.main.App.GetReceivedFile();
          },
          /**
           * GetSelectedFiles
           * @returns {Promise<Array<string>>}  - Go Type: []string
           */
          "GetSelectedFiles": () => {
            return window.go.main.App.GetSelectedFiles();
          },
          /**
           * GetUserPrefs
           * @returns {Promise<UserSettings>}  - Go Type: settings.UserSettings
           */
          "GetUserPrefs": () => {
            return window.go.main.App.GetUserPrefs();
          },
          /**
           * OpenDirectoryDialog
           * @returns {Promise<Array<string>|Error>}  - Go Type: []string
           */
          "OpenDirectoryDialog": () => {
            return window.go.main.App.OpenDirectoryDialog();
          },
          /**
           * OpenFile
           * @param {string} arg1 - Go Type: string
           * @returns {Promise<void>} 
           */
          "OpenFile": (arg1) => {
            return window.go.main.App.OpenFile(arg1);
          },
          /**
           * OpenFilesDialog
           * @returns {Promise<Array<string>|Error>}  - Go Type: []string
           */
          "OpenFilesDialog": () => {
            return window.go.main.App.OpenFilesDialog();
          },
          /**
           * PersistUserSettings
           * @returns {Promise<void>} 
           */
          "PersistUserSettings": () => {
            return window.go.main.App.PersistUserSettings();
          },
          /**
           * ReceiveFile
           * @param {string} arg1 - Go Type: string
           * @returns {Promise<void>} 
           */
          "ReceiveFile": (arg1) => {
            return window.go.main.App.ReceiveFile(arg1);
          },
          /**
           * SelectedFilesSend
           * @returns {Promise<void>} 
           */
          "SelectedFilesSend": () => {
            return window.go.main.App.SelectedFilesSend();
          },
          /**
           * SendDirectory
           * @param {string} arg1 - Go Type: string
           * @returns {Promise<void>} 
           */
          "SendDirectory": (arg1) => {
            return window.go.main.App.SendDirectory(arg1);
          },
          /**
           * SendFile
           * @param {string} arg1 - Go Type: string
           * @returns {Promise<void>} 
           */
          "SendFile": (arg1) => {
            return window.go.main.App.SendFile(arg1);
          },
          /**
           * SetDownloadsFolder
           * @returns {Promise<string>}  - Go Type: string
           */
          "SetDownloadsFolder": () => {
            return window.go.main.App.SetDownloadsFolder();
          },
          /**
           * SetNotificationsParam
           * @param {boolean} arg1 - Go Type: bool
           * @returns {Promise<boolean>}  - Go Type: bool
           */
          "SetNotificationsParam": (arg1) => {
            return window.go.main.App.SetNotificationsParam(arg1);
          },
          /**
           * SetOverwriteParam
           * @param {boolean} arg1 - Go Type: bool
           * @returns {Promise<boolean>}  - Go Type: bool
           */
          "SetOverwriteParam": (arg1) => {
            return window.go.main.App.SetOverwriteParam(arg1);
          },
          /**
           * SetSelfUpdateParam
           * @param {boolean} arg1 - Go Type: bool
           * @returns {Promise<boolean>}  - Go Type: bool
           */
          "SetSelfUpdateParam": (arg1) => {
            return window.go.main.App.SetSelfUpdateParam(arg1);
          },
          /**
           * ShowErrorDialog
           * @param {string} arg1 - Go Type: string
           * @returns {Promise<void>} 
           */
          "ShowErrorDialog": (arg1) => {
            return window.go.main.App.ShowErrorDialog(arg1);
          },
          /**
           * UpdateCheckUI
           * @returns {Promise<void>} 
           */
          "UpdateCheckUI": () => {
            return window.go.main.App.UpdateCheckUI();
          },
          /**
           * UpdateSendProgress
           * @param {number} arg1 - Go Type: int64
           * @param {number} arg2 - Go Type: int64
           * @returns {Promise<void>} 
           */
          "UpdateSendProgress": (arg1, arg2) => {
            return window.go.main.App.UpdateSendProgress(arg1, arg2);
          },
          /**
           * VerifyNotificationIcon
           * @returns {Promise<string>}  - Go Type: string
           */
          "VerifyNotificationIcon": () => {
            return window.go.main.App.VerifyNotificationIcon();
          },
        },
      },

    };

    /* src/progress.svelte generated by Svelte v3.38.3 */
    const file$5 = "src/progress.svelte";

    function create_fragment$5(ctx) {
    	let div4;
    	let div3;
    	let div0;
    	let span0;
    	let t0;
    	let t1;
    	let span1;
    	let t2;
    	let t3;
    	let t4;
    	let div2;
    	let div1;
    	let div1_style_value;
    	let t5;
    	let div4_transition;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			span0 = element("span");
    			t0 = text(/*status*/ ctx[0]);
    			t1 = space();
    			span1 = element("span");
    			t2 = text(/*percent*/ ctx[1]);
    			t3 = text("%");
    			t4 = space();
    			div2 = element("div");
    			div1 = element("div");
    			t5 = space();
    			if (default_slot) default_slot.c();
    			attr_dev(span0, "class", "text-base text-gray-100 font-medium");
    			add_location(span0, file$5, 9, 6, 249);
    			attr_dev(span1, "class", "text-sm font-medium text-gray-100");
    			add_location(span1, file$5, 12, 6, 337);
    			attr_dev(div0, "class", "mb-1 flex justify-between");
    			add_location(div0, file$5, 8, 4, 203);
    			attr_dev(div1, "class", "bg-green-500 h-4 rounded-full animate-pulse");
    			attr_dev(div1, "style", div1_style_value = "width: " + /*percent*/ ctx[1].toString() + "%");
    			add_location(div1, file$5, 17, 6, 504);
    			attr_dev(div2, "class", "w-full bg-green-900 rounded-full h-4 shadow-inner");
    			add_location(div2, file$5, 16, 4, 434);
    			attr_dev(div3, "class", "progress-inner");
    			add_location(div3, file$5, 7, 2, 170);
    			attr_dev(div4, "class", "progress-outer");
    			add_location(div4, file$5, 6, 0, 122);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			append_dev(div0, span0);
    			append_dev(span0, t0);
    			append_dev(div0, t1);
    			append_dev(div0, span1);
    			append_dev(span1, t2);
    			append_dev(span1, t3);
    			append_dev(div3, t4);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div3, t5);

    			if (default_slot) {
    				default_slot.m(div3, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*status*/ 1) set_data_dev(t0, /*status*/ ctx[0]);
    			if (!current || dirty & /*percent*/ 2) set_data_dev(t2, /*percent*/ ctx[1]);

    			if (!current || dirty & /*percent*/ 2 && div1_style_value !== (div1_style_value = "width: " + /*percent*/ ctx[1].toString() + "%")) {
    				attr_dev(div1, "style", div1_style_value);
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 4)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], !current ? -1 : dirty, null, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);

    			add_render_callback(() => {
    				if (!div4_transition) div4_transition = create_bidirectional_transition(div4, slide, {}, true);
    				div4_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			if (!div4_transition) div4_transition = create_bidirectional_transition(div4, slide, {}, false);
    			div4_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			if (default_slot) default_slot.d(detaching);
    			if (detaching && div4_transition) div4_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Progress", slots, ['default']);
    	let { status = waiting } = $$props;
    	let { percent = 0 } = $$props;
    	const writable_props = ["status", "percent"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Progress> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("status" in $$props) $$invalidate(0, status = $$props.status);
    		if ("percent" in $$props) $$invalidate(1, percent = $$props.percent);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ status, percent, slide });

    	$$self.$inject_state = $$props => {
    		if ("status" in $$props) $$invalidate(0, status = $$props.status);
    		if ("percent" in $$props) $$invalidate(1, percent = $$props.percent);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [status, percent, $$scope, slots];
    }

    class Progress extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { status: 0, percent: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Progress",
    			options,
    			id: create_fragment$5.name
    		});
    	}

    	get status() {
    		throw new Error("<Progress>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set status(value) {
    		throw new Error("<Progress>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get percent() {
    		throw new Error("<Progress>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set percent(value) {
    		throw new Error("<Progress>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/sender.svelte generated by Svelte v3.38.3 */

    const { console: console_1$1 } = globals;
    const file$4 = "src/sender.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	child_ctx[13] = i;
    	return child_ctx;
    }

    // (139:4) {:else}
    function create_else_block$1(ctx) {
    	let div2;
    	let div0;
    	let span0;
    	let t1;
    	let button0;
    	let t2;
    	let div1;
    	let span1;
    	let t4;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			span0 = element("span");
    			span0.textContent = "Send Files";
    			t1 = space();
    			button0 = element("button");
    			t2 = space();
    			div1 = element("div");
    			span1 = element("span");
    			span1.textContent = "Send Directory";
    			t4 = space();
    			button1 = element("button");
    			attr_dev(span0, "class", "tooltip");
    			add_location(span0, file$4, 143, 10, 3756);
    			attr_dev(button0, "class", "file-select-icon");
    			button0.disabled = /*isSending*/ ctx[4];
    			add_location(button0, file$4, 144, 10, 3806);
    			attr_dev(div0, "class", "has-tooltip");
    			add_location(div0, file$4, 142, 8, 3720);
    			attr_dev(span1, "class", "tooltip");
    			add_location(span1, file$4, 151, 10, 3995);
    			attr_dev(button1, "class", "folder-select-icon");
    			button1.disabled = /*isSending*/ ctx[4];
    			add_location(button1, file$4, 152, 10, 4049);
    			attr_dev(div1, "class", "has-tooltip");
    			add_location(div1, file$4, 150, 8, 3959);
    			attr_dev(div2, "class", "flex flex-row items-center content-center justify-around place-items-center h-full");
    			add_location(div2, file$4, 139, 6, 3600);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, span0);
    			append_dev(div0, t1);
    			append_dev(div0, button0);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, span1);
    			append_dev(div1, t4);
    			append_dev(div1, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*openFilesDialog*/ ctx[7], false, false, false),
    					listen_dev(button1, "click", /*openDirectoryDialog*/ ctx[6], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*isSending*/ 16) {
    				prop_dev(button0, "disabled", /*isSending*/ ctx[4]);
    			}

    			if (dirty & /*isSending*/ 16) {
    				prop_dev(button1, "disabled", /*isSending*/ ctx[4]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(139:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (124:4) {#if selectedFiles.length > 0}
    function create_if_block_3$1(ctx) {
    	let div;
    	let each_value = /*selectedFileNames*/ ctx[5];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "grid grid-flow-row");
    			add_location(div, file$4, 124, 6, 3098);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*selectedFileNames, selectedFiles*/ 33) {
    				each_value = /*selectedFileNames*/ ctx[5];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(124:4) {#if selectedFiles.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (132:29) 
    function create_if_block_5(ctx) {
    	let div;
    	let t0;
    	let t1_value = /*selectedFiles*/ ctx[0].length + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("...Total Selected: ");
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(div, "class", "text-xs text-gray-100");
    			add_location(div, file$4, 132, 12, 3426);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*selectedFiles*/ 1 && t1_value !== (t1_value = /*selectedFiles*/ ctx[0].length + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(132:29) ",
    		ctx
    	});

    	return block;
    }

    // (127:10) {#if idx < 9}
    function create_if_block_4(ctx) {
    	let div1;
    	let div0;
    	let t0;
    	let span;
    	let t1_value = /*fileName*/ ctx[11] + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			span = element("span");
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(div0, "class", "icon send-file-icon mr-1");
    			add_location(div0, file$4, 128, 14, 3256);
    			attr_dev(span, "class", "text-gray-300 text-xs");
    			add_location(span, file$4, 129, 14, 3311);
    			attr_dev(div1, "class", "flex mb-1");
    			add_location(div1, file$4, 127, 12, 3218);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div1, t0);
    			append_dev(div1, span);
    			append_dev(span, t1);
    			append_dev(div1, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*selectedFileNames*/ 32 && t1_value !== (t1_value = /*fileName*/ ctx[11] + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(127:10) {#if idx < 9}",
    		ctx
    	});

    	return block;
    }

    // (126:8) {#each selectedFileNames as fileName, idx}
    function create_each_block$1(ctx) {
    	let if_block_anchor;

    	function select_block_type_1(ctx, dirty) {
    		if (/*idx*/ ctx[13] < 9) return create_if_block_4;
    		if (/*idx*/ ctx[13] == 9) return create_if_block_5;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (if_block) if_block.p(ctx, dirty);
    		},
    		d: function destroy(detaching) {
    			if (if_block) {
    				if_block.d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(126:8) {#each selectedFileNames as fileName, idx}",
    		ctx
    	});

    	return block;
    }

    // (163:4) {#if selectedFiles.length > 0}
    function create_if_block_2$2(ctx) {
    	let button0;
    	let t0;
    	let button0_intro;
    	let t1;
    	let button1;
    	let t2;
    	let button1_intro;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button0 = element("button");
    			t0 = text("Clear");
    			t1 = space();
    			button1 = element("button");
    			t2 = text("Send");
    			attr_dev(button0, "class", "cancel-button");
    			button0.disabled = /*isSending*/ ctx[4];
    			add_location(button0, file$4, 163, 6, 4301);
    			attr_dev(button1, "class", "send-button");
    			button1.disabled = /*isSending*/ ctx[4];
    			add_location(button1, file$4, 169, 6, 4460);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button0, anchor);
    			append_dev(button0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button1, anchor);
    			append_dev(button1, t2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*onReset*/ ctx[8], false, false, false),
    					listen_dev(button1, "click", /*sendFile*/ ctx[10], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*isSending*/ 16) {
    				prop_dev(button0, "disabled", /*isSending*/ ctx[4]);
    			}

    			if (dirty & /*isSending*/ 16) {
    				prop_dev(button1, "disabled", /*isSending*/ ctx[4]);
    			}
    		},
    		i: function intro(local) {
    			if (!button0_intro) {
    				add_render_callback(() => {
    					button0_intro = create_in_transition(button0, slide, { duration: 200 });
    					button0_intro.start();
    				});
    			}

    			if (!button1_intro) {
    				add_render_callback(() => {
    					button1_intro = create_in_transition(button1, slide, { duration: 200 });
    					button1_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(163:4) {#if selectedFiles.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (178:2) {#if isSending}
    function create_if_block$3(ctx) {
    	let progress;
    	let current;

    	progress = new Progress({
    			props: {
    				percent: /*sendPercent*/ ctx[3],
    				status: /*status*/ ctx[2],
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(progress.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(progress, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const progress_changes = {};
    			if (dirty & /*sendPercent*/ 8) progress_changes.percent = /*sendPercent*/ ctx[3];
    			if (dirty & /*status*/ 4) progress_changes.status = /*status*/ ctx[2];

    			if (dirty & /*$$scope, sendCode*/ 16386) {
    				progress_changes.$$scope = { dirty, ctx };
    			}

    			progress.$set(progress_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(progress.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(progress.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(progress, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(178:2) {#if isSending}",
    		ctx
    	});

    	return block;
    }

    // (184:8) {#if sendCode}
    function create_if_block_1$2(ctx) {
    	let div2;
    	let label;
    	let t1;
    	let div1;
    	let input;
    	let t2;
    	let button;
    	let div0;
    	let div2_transition;
    	let current;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			label = element("label");
    			label.textContent = "Send Code";
    			t1 = space();
    			div1 = element("div");
    			input = element("input");
    			t2 = space();
    			button = element("button");
    			div0 = element("div");
    			attr_dev(label, "for", "sendCode");
    			attr_dev(label, "class", "send-input-label");
    			add_location(label, file$4, 185, 12, 4925);
    			attr_dev(input, "id", "sendCode");
    			input.readOnly = true;
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Send code will appear");
    			input.value = /*sendCode*/ ctx[1];
    			attr_dev(input, "class", "send-input mt-1");
    			add_location(input, file$4, 187, 12, 5042);
    			attr_dev(div0, "class", "copy-icon");
    			add_location(div0, file$4, 195, 70, 5330);
    			attr_dev(button, "class", "copy-button mt-1 ml-1");
    			add_location(button, file$4, 195, 12, 5272);
    			attr_dev(div1, "class", "flex flex-row");
    			add_location(div1, file$4, 186, 12, 5002);
    			attr_dev(div2, "class", "mx-auto mt-2");
    			add_location(div2, file$4, 184, 10, 4869);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, label);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, input);
    			append_dev(div1, t2);
    			append_dev(div1, button);
    			append_dev(button, div0);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", copyCode, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*sendCode*/ 2 && input.value !== /*sendCode*/ ctx[1]) {
    				prop_dev(input, "value", /*sendCode*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div2_transition) div2_transition = create_bidirectional_transition(div2, slide, {}, true);
    				div2_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div2_transition) div2_transition = create_bidirectional_transition(div2, slide, {}, false);
    			div2_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (detaching && div2_transition) div2_transition.end();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(184:8) {#if sendCode}",
    		ctx
    	});

    	return block;
    }

    // (179:4) <Progress percent={sendPercent} {status}>
    function create_default_slot$1(ctx) {
    	let div;
    	let button;
    	let t1;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*sendCode*/ ctx[1] && create_if_block_1$2(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			button.textContent = "Cancel";
    			t1 = space();
    			if (if_block) if_block.c();
    			attr_dev(button, "class", "my-2 mx-auto cancel-button");
    			add_location(button, file$4, 180, 8, 4737);
    			attr_dev(div, "class", "container grid");
    			add_location(div, file$4, 179, 6, 4700);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);
    			append_dev(div, t1);
    			if (if_block) if_block.m(div, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*onCancel*/ ctx[9], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*sendCode*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*sendCode*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(179:4) <Progress percent={sendPercent} {status}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div2;
    	let div0;
    	let t0;
    	let div1;
    	let t1;
    	let current;

    	function select_block_type(ctx, dirty) {
    		if (/*selectedFiles*/ ctx[0].length > 0) return create_if_block_3$1;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*selectedFiles*/ ctx[0].length > 0 && create_if_block_2$2(ctx);
    	let if_block2 = /*isSending*/ ctx[4] && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			if_block0.c();
    			t0 = space();
    			div1 = element("div");
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			attr_dev(div0, "class", "border-2 border-green-300 rounded-md shadow-md w-72 h-56 p-2 mx-auto cursor-fix send-icon-container");
    			add_location(div0, file$4, 119, 2, 2877);
    			attr_dev(div1, "class", "p-2 mx-auto");
    			add_location(div1, file$4, 161, 2, 4234);
    			attr_dev(div2, "class", "flex flex-col justify-items-center content-center m-2");
    			add_location(div2, file$4, 118, 0, 2807);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			if_block0.m(div0, null);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			if (if_block1) if_block1.m(div1, null);
    			append_dev(div2, t1);
    			if (if_block2) if_block2.m(div2, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div0, null);
    				}
    			}

    			if (/*selectedFiles*/ ctx[0].length > 0) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*selectedFiles*/ 1) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_2$2(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div1, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*isSending*/ ctx[4]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty & /*isSending*/ 16) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block$3(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(div2, null);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block1);
    			transition_in(if_block2);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block2);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function copyCode() {
    	/* Get the text field */
    	var copyText = document.getElementById("sendCode");

    	/* Select the text field */
    	copyText.select();

    	copyText.setSelectionRange(0, 99999); /* For mobile devices */

    	/* Copy the text inside the text field */
    	navigator.clipboard.writeText(copyText.value);
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let selectedFileNames;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Sender", slots, []);

    	String.prototype.trimEllip = function (length) {
    		return this.length > length
    		? this.substring(0, length) + "..."
    		: this;
    	};

    	let sendCode = "";
    	let status = "waiting";
    	let sendPercent = 0;
    	let selectedFiles = [];
    	let isSending = false;

    	function openDirectoryDialog() {
    		go.main.App.OpenDirectoryDialog().then(selection => {
    			if (selection != null) {
    				$$invalidate(0, selectedFiles = selection);
    			} else {
    				$$invalidate(0, selectedFiles = []);
    			}
    		}).catch(err => {
    			// No directory selected
    			console.log(err);
    		});
    	}

    	function openFilesDialog() {
    		go.main.App.OpenFilesDialog().then(selection => {
    			if (selection != null) {
    				$$invalidate(0, selectedFiles = selection);
    			} else {
    				$$invalidate(0, selectedFiles = []);
    			}
    		}).catch(err => {
    			// No files selected
    			console.log(err);
    		});
    	}

    	function onReset() {
    		$$invalidate(1, sendCode = "");
    		$$invalidate(2, status = "waiting");
    		$$invalidate(3, sendPercent = 0);
    		$$invalidate(0, selectedFiles = []);
    		$$invalidate(4, isSending = false);
    		go.main.App.ClearSelectedFiles();
    	}

    	function onCancel() {
    		go.main.App.CancelWormholeRequest().then(() => {
    			$$invalidate(4, isSending = false);
    			$$invalidate(1, sendCode = "");
    			$$invalidate(2, status = "waiting");
    			$$invalidate(3, sendPercent = 0);
    		}).catch(err => {
    			console.log(err);
    		});
    	}

    	function sendFile() {
    		go.main.App.SelectedFilesSend();
    		$$invalidate(4, isSending = true);
    	}

    	window.runtime.EventsOn("send:started", function (newCode) {
    		$$invalidate(1, sendCode = newCode);
    	});

    	window.runtime.EventsOn("send:updated", function (percent) {
    		$$invalidate(3, sendPercent = percent);

    		if (status != "transferring") {
    			$$invalidate(2, status = "transferring");
    		}
    	});

    	window.runtime.EventsOn("send:status", function (sendStatus) {
    		$$invalidate(2, status = sendStatus);

    		if (sendStatus == "completed" || sendStatus == "failed") {
    			setTimeout(
    				() => {
    					$$invalidate(4, isSending = false);
    					$$invalidate(1, sendCode = "");
    					$$invalidate(3, sendPercent = 0);
    				},
    				500
    			);
    		}
    	});

    	onMount(() => {
    		go.main.App.GetSelectedFiles().then(filePaths => {
    			if (filePaths && filePaths.length > 0) {
    				$$invalidate(0, selectedFiles = filePaths);
    			}
    		});
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<Sender> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		slide,
    		go,
    		Progress,
    		sendCode,
    		status,
    		sendPercent,
    		selectedFiles,
    		isSending,
    		openDirectoryDialog,
    		openFilesDialog,
    		onReset,
    		onCancel,
    		copyCode,
    		sendFile,
    		selectedFileNames
    	});

    	$$self.$inject_state = $$props => {
    		if ("sendCode" in $$props) $$invalidate(1, sendCode = $$props.sendCode);
    		if ("status" in $$props) $$invalidate(2, status = $$props.status);
    		if ("sendPercent" in $$props) $$invalidate(3, sendPercent = $$props.sendPercent);
    		if ("selectedFiles" in $$props) $$invalidate(0, selectedFiles = $$props.selectedFiles);
    		if ("isSending" in $$props) $$invalidate(4, isSending = $$props.isSending);
    		if ("selectedFileNames" in $$props) $$invalidate(5, selectedFileNames = $$props.selectedFileNames);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*selectedFiles*/ 1) {
    			$$invalidate(5, selectedFileNames = selectedFiles.map(fileName => fileName.split("\\").pop().split("/").pop().trimEllip(30)));
    		}
    	};

    	return [
    		selectedFiles,
    		sendCode,
    		status,
    		sendPercent,
    		isSending,
    		selectedFileNames,
    		openDirectoryDialog,
    		openFilesDialog,
    		onReset,
    		onCancel,
    		sendFile
    	];
    }

    class Sender extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Sender",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/receiver.svelte generated by Svelte v3.38.3 */

    const { console: console_1 } = globals;
    const file$3 = "src/receiver.svelte";

    // (88:4) {#if receivePath}
    function create_if_block_1$1(ctx) {
    	let div1;
    	let div0;
    	let t0;
    	let span;
    	let t1;
    	let t2;
    	let if_block = !/*isReceiving*/ ctx[4] && create_if_block_2$1(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			span = element("span");
    			t1 = text(/*receiveFileName*/ ctx[6]);
    			t2 = space();
    			if (if_block) if_block.c();
    			attr_dev(div0, "class", "icon-lg receive-file-icon");
    			add_location(div0, file$3, 92, 8, 2250);
    			attr_dev(span, "class", "text-gray-200");
    			add_location(span, file$3, 93, 8, 2300);
    			attr_dev(div1, "class", "flex flex-col justify-center items-center space-y-2 bg-gray-800 rounded-md bg-opacity-60 h-full");
    			add_location(div1, file$3, 89, 6, 2117);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div1, t0);
    			append_dev(div1, span);
    			append_dev(span, t1);
    			append_dev(div1, t2);
    			if (if_block) if_block.m(div1, null);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*receiveFileName*/ 64) set_data_dev(t1, /*receiveFileName*/ ctx[6]);

    			if (!/*isReceiving*/ ctx[4]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_2$1(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(88:4) {#if receivePath}",
    		ctx
    	});

    	return block;
    }

    // (95:8) {#if !isReceiving}
    function create_if_block_2$1(ctx) {
    	let div;
    	let button0;
    	let t1;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button0 = element("button");
    			button0.textContent = "Open File";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "Open Folder";
    			attr_dev(button0, "class", "open-button text-sm");
    			add_location(button0, file$3, 96, 10, 2434);
    			attr_dev(button1, "class", "open-button text-sm");
    			add_location(button1, file$3, 97, 10, 2519);
    			attr_dev(div, "class", "inline-flex space-x-1");
    			add_location(div, file$3, 95, 8, 2388);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button0);
    			append_dev(div, t1);
    			append_dev(div, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*openFile*/ ctx[8], false, false, false),
    					listen_dev(button1, "click", /*openDownloadsFolder*/ ctx[9], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(95:8) {#if !isReceiving}",
    		ctx
    	});

    	return block;
    }

    // (117:2) {#if isReceiving}
    function create_if_block$2(ctx) {
    	let progress;
    	let current;

    	progress = new Progress({
    			props: {
    				percent: /*receivePercent*/ ctx[3],
    				status: /*status*/ ctx[2],
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(progress.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(progress, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const progress_changes = {};
    			if (dirty & /*receivePercent*/ 8) progress_changes.percent = /*receivePercent*/ ctx[3];
    			if (dirty & /*status*/ 4) progress_changes.status = /*status*/ ctx[2];

    			if (dirty & /*$$scope*/ 4096) {
    				progress_changes.$$scope = { dirty, ctx };
    			}

    			progress.$set(progress_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(progress.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(progress.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(progress, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(117:2) {#if isReceiving}",
    		ctx
    	});

    	return block;
    }

    // (118:4) <Progress percent={receivePercent} {status}>
    function create_default_slot(ctx) {
    	let div;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			button.textContent = "Cancel";
    			attr_dev(button, "class", "my-2 mx-auto cancel-button");
    			add_location(button, file$3, 119, 8, 3252);
    			attr_dev(div, "class", "container grid");
    			add_location(div, file$3, 118, 6, 3215);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*onCancel*/ ctx[10], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(118:4) <Progress percent={receivePercent} {status}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div2;
    	let div0;
    	let t0;
    	let div1;
    	let form;
    	let label;
    	let t2;
    	let input;
    	let t3;
    	let button;
    	let t4;
    	let button_disabled_value;
    	let t5;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*receivePath*/ ctx[1] && create_if_block_1$1(ctx);
    	let if_block1 = /*isReceiving*/ ctx[4] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			div1 = element("div");
    			form = element("form");
    			label = element("label");
    			label.textContent = "Receive Code";
    			t2 = space();
    			input = element("input");
    			t3 = space();
    			button = element("button");
    			t4 = text("Download");
    			t5 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(div0, "class", "border-2 border-green-300 rounded-md shadow-md w-72 h-56 p-2 mx-auto receive-icon-container");
    			add_location(div0, file$3, 84, 2, 1908);
    			attr_dev(label, "for", "receiveCode");
    			attr_dev(label, "class", "receive-input-label");
    			add_location(label, file$3, 105, 6, 2771);
    			attr_dev(input, "id", "receiveCode");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "eg. 5-component-button");
    			attr_dev(input, "class", "receive-input");
    			add_location(input, file$3, 106, 6, 2852);
    			attr_dev(button, "class", "receive-button");
    			attr_dev(button, "type", "submit");
    			button.disabled = button_disabled_value = !/*receiveCodeValid*/ ctx[5];
    			add_location(button, file$3, 113, 6, 3027);
    			attr_dev(form, "autocomplete", "off");
    			add_location(form, file$3, 104, 4, 2700);
    			attr_dev(div1, "class", "p-2 mx-auto");
    			add_location(div1, file$3, 103, 2, 2670);
    			attr_dev(div2, "class", "flex flex-col justify-items-center content-center m-2");
    			add_location(div2, file$3, 83, 0, 1838);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			if (if_block0) if_block0.m(div0, null);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, form);
    			append_dev(form, label);
    			append_dev(form, t2);
    			append_dev(form, input);
    			set_input_value(input, /*receiveCode*/ ctx[0]);
    			append_dev(form, t3);
    			append_dev(form, button);
    			append_dev(button, t4);
    			append_dev(div2, t5);
    			if (if_block1) if_block1.m(div2, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[11]),
    					listen_dev(form, "submit", prevent_default(/*receiveFile*/ ctx[7]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*receivePath*/ ctx[1]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1$1(ctx);
    					if_block0.c();
    					if_block0.m(div0, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*receiveCode*/ 1 && input.value !== /*receiveCode*/ ctx[0]) {
    				set_input_value(input, /*receiveCode*/ ctx[0]);
    			}

    			if (!current || dirty & /*receiveCodeValid*/ 32 && button_disabled_value !== (button_disabled_value = !/*receiveCodeValid*/ ctx[5])) {
    				prop_dev(button, "disabled", button_disabled_value);
    			}

    			if (/*isReceiving*/ ctx[4]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*isReceiving*/ 16) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block$2(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div2, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const receivePattern = /\d+\-\w+\-\w+/;

    function instance$3($$self, $$props, $$invalidate) {
    	let receiveCodeValid;
    	let receiveFileName;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Receiver", slots, []);
    	let receiveCode = "";
    	let status = "waiting";
    	let receivePercent = 0;
    	let isReceiving = false;
    	let receivePath = "";

    	String.prototype.trimEllip = function (length) {
    		return this.length > length
    		? this.substring(0, length) + "..."
    		: this;
    	};

    	function receiveFile() {
    		go.main.App.ReceiveFile(receiveCode);
    	}

    	function openFile() {
    		go.main.App.OpenFile(receivePath);
    	}

    	function openDownloadsFolder() {
    		go.main.App.GetUserPrefs().then(prefs => {
    			go.main.App.OpenFile(prefs.downloadsDirectory);
    		});
    	}

    	function onCancel() {
    		go.main.App.CancelWormholeRequest().then(() => {
    			$$invalidate(4, isReceiving = false);
    			$$invalidate(0, receiveCode = "");
    			$$invalidate(2, status = "waiting");
    			$$invalidate(3, receivePercent = 0);
    			$$invalidate(1, receivePath = "");
    		}).catch(err => {
    			console.log(err);
    		});
    	}

    	window.runtime.EventsOn("receive:updated", function (percent) {
    		$$invalidate(3, receivePercent = percent);
    	});

    	window.runtime.EventsOn("receive:started", function () {
    		$$invalidate(4, isReceiving = true);
    	});

    	window.runtime.EventsOn("receive:path", function (path) {
    		$$invalidate(1, receivePath = path);
    	});

    	window.runtime.EventsOn("receive:status", function (receiveStatus) {
    		$$invalidate(2, status = receiveStatus);

    		if (receiveStatus == "completed") {
    			setTimeout(
    				() => {
    					$$invalidate(4, isReceiving = false);
    					$$invalidate(3, receivePercent = 0);
    				},
    				500
    			);
    		}
    	});

    	onMount(() => {
    		go.main.App.GetReceivedFile().then(path => {
    			if (path) {
    				$$invalidate(1, receivePath = path);
    			}
    		});
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Receiver> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		receiveCode = this.value;
    		$$invalidate(0, receiveCode);
    	}

    	$$self.$capture_state = () => ({
    		go,
    		Progress,
    		onMount,
    		receiveCode,
    		receivePattern,
    		status,
    		receivePercent,
    		isReceiving,
    		receivePath,
    		receiveFile,
    		openFile,
    		openDownloadsFolder,
    		onCancel,
    		receiveCodeValid,
    		receiveFileName
    	});

    	$$self.$inject_state = $$props => {
    		if ("receiveCode" in $$props) $$invalidate(0, receiveCode = $$props.receiveCode);
    		if ("status" in $$props) $$invalidate(2, status = $$props.status);
    		if ("receivePercent" in $$props) $$invalidate(3, receivePercent = $$props.receivePercent);
    		if ("isReceiving" in $$props) $$invalidate(4, isReceiving = $$props.isReceiving);
    		if ("receivePath" in $$props) $$invalidate(1, receivePath = $$props.receivePath);
    		if ("receiveCodeValid" in $$props) $$invalidate(5, receiveCodeValid = $$props.receiveCodeValid);
    		if ("receiveFileName" in $$props) $$invalidate(6, receiveFileName = $$props.receiveFileName);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*receiveCode*/ 1) {
    			$$invalidate(5, receiveCodeValid = receivePattern.test(receiveCode));
    		}

    		if ($$self.$$.dirty & /*receivePath*/ 2) {
    			$$invalidate(6, receiveFileName = receivePath.split("\\").pop().split("/").pop().trimEllip(24));
    		}
    	};

    	return [
    		receiveCode,
    		receivePath,
    		status,
    		receivePercent,
    		isReceiving,
    		receiveCodeValid,
    		receiveFileName,
    		receiveFile,
    		openFile,
    		openDownloadsFolder,
    		onCancel,
    		input_input_handler
    	];
    }

    class Receiver extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Receiver",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/settings.svelte generated by Svelte v3.38.3 */
    const file$2 = "src/settings.svelte";

    // (104:4) {:else}
    function create_else_block(ctx) {
    	let label;
    	let t1;
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			label = element("label");
    			label.textContent = "Auto Update Enabled";
    			t1 = space();
    			input = element("input");
    			attr_dev(label, "class", "text-sm");
    			attr_dev(label, "for", "selfUpdate");
    			add_location(label, file$2, 104, 4, 3006);
    			attr_dev(input, "class", "checkbox");
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "id", "selfUpdate");
    			attr_dev(input, "name", "selfUpdate");
    			input.checked = /*selfUpdate*/ ctx[3];
    			add_location(input, file$2, 105, 4, 3078);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, input, anchor);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*toggleSelfUpdate*/ ctx[11], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*selfUpdate*/ 8) {
    				prop_dev(input, "checked", /*selfUpdate*/ ctx[3]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(input);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(104:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (102:4) {#if packageManaged}
    function create_if_block$1(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "Update from Package Manager";
    			attr_dev(span, "class", "text-sm");
    			add_location(span, file$2, 102, 4, 2933);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(102:4) {#if packageManaged}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div16;
    	let div4;
    	let div0;
    	let t1;
    	let div3;
    	let div1;
    	let t2;
    	let t3;
    	let div2;
    	let button0;
    	let t5;
    	let button1;
    	let t7;
    	let div5;
    	let t9;
    	let div6;
    	let label0;
    	let t11;
    	let input0;
    	let t12;
    	let div7;
    	let t14;
    	let div8;
    	let label1;
    	let t16;
    	let input1;
    	let t17;
    	let div9;
    	let t19;
    	let div10;
    	let t20;
    	let div15;
    	let div11;
    	let t22;
    	let div14;
    	let div12;
    	let t23;
    	let t24;
    	let div13;
    	let button2;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*packageManaged*/ ctx[4]) return create_if_block$1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div16 = element("div");
    			div4 = element("div");
    			div0 = element("div");
    			div0.textContent = "Downloads Folder";
    			t1 = space();
    			div3 = element("div");
    			div1 = element("div");
    			t2 = text(/*downloadPathCleaned*/ ctx[5]);
    			t3 = space();
    			div2 = element("div");
    			button0 = element("button");
    			button0.textContent = "Edit";
    			t5 = space();
    			button1 = element("button");
    			button1.textContent = "Open";
    			t7 = space();
    			div5 = element("div");
    			div5.textContent = "Notifications";
    			t9 = space();
    			div6 = element("div");
    			label0 = element("label");
    			label0.textContent = "Show Desktop Notifications";
    			t11 = space();
    			input0 = element("input");
    			t12 = space();
    			div7 = element("div");
    			div7.textContent = "Overwrite";
    			t14 = space();
    			div8 = element("div");
    			label1 = element("label");
    			label1.textContent = "Overwrite Existing Files";
    			t16 = space();
    			input1 = element("input");
    			t17 = space();
    			div9 = element("div");
    			div9.textContent = "Auto Update";
    			t19 = space();
    			div10 = element("div");
    			if_block.c();
    			t20 = space();
    			div15 = element("div");
    			div11 = element("div");
    			div11.textContent = "Logs";
    			t22 = space();
    			div14 = element("div");
    			div12 = element("div");
    			t23 = text(/*logPathCleaned*/ ctx[6]);
    			t24 = space();
    			div13 = element("div");
    			button2 = element("button");
    			button2.textContent = "Open";
    			attr_dev(div0, "class", "text-gray-300 font-bold");
    			add_location(div0, file$2, 61, 4, 1524);
    			attr_dev(div1, "class", "text-gray-200 text-xs max-w-md");
    			add_location(div1, file$2, 63, 6, 1651);
    			attr_dev(button0, "class", "settings-button");
    			add_location(button0, file$2, 65, 8, 1778);
    			attr_dev(button1, "class", "settings-button");
    			add_location(button1, file$2, 68, 8, 1882);
    			attr_dev(div2, "class", "w-22 inline-flex space-x-1");
    			add_location(div2, file$2, 64, 6, 1729);
    			attr_dev(div3, "class", "flex flex-row items-center justify-between");
    			add_location(div3, file$2, 62, 4, 1588);
    			attr_dev(div4, "class", "mb-2");
    			add_location(div4, file$2, 60, 2, 1501);
    			attr_dev(div5, "class", "text-gray-300 font-bold");
    			add_location(div5, file$2, 74, 2, 2014);
    			attr_dev(label0, "class", "text-sm");
    			attr_dev(label0, "for", "notifications");
    			add_location(label0, file$2, 76, 4, 2139);
    			attr_dev(input0, "class", "checkbox");
    			attr_dev(input0, "type", "checkbox");
    			attr_dev(input0, "id", "notifications");
    			attr_dev(input0, "name", "notifications");
    			input0.checked = /*notifications*/ ctx[1];
    			add_location(input0, file$2, 78, 4, 2226);
    			attr_dev(div6, "class", "flex flex-row items-center justify-between mb-2");
    			add_location(div6, file$2, 75, 2, 2073);
    			attr_dev(div7, "class", "text-gray-300 font-bold");
    			add_location(div7, file$2, 87, 2, 2415);
    			attr_dev(label1, "class", "text-sm");
    			attr_dev(label1, "for", "overwrite");
    			add_location(label1, file$2, 89, 4, 2536);
    			attr_dev(input1, "class", "checkbox");
    			attr_dev(input1, "type", "checkbox");
    			attr_dev(input1, "id", "overwrite");
    			attr_dev(input1, "name", "overwrite");
    			input1.checked = /*overwrite*/ ctx[2];
    			add_location(input1, file$2, 90, 4, 2612);
    			attr_dev(div8, "class", "flex flex-row items-center justify-between mb-2");
    			add_location(div8, file$2, 88, 2, 2470);
    			attr_dev(div9, "class", "text-gray-300 font-bold");
    			add_location(div9, file$2, 99, 2, 2785);
    			attr_dev(div10, "class", "flex flex-row items-center justify-between mb-2");
    			add_location(div10, file$2, 100, 2, 2842);
    			attr_dev(div11, "class", "text-gray-300 font-bold");
    			add_location(div11, file$2, 116, 4, 3288);
    			attr_dev(div12, "class", "text-gray-200 text-xs");
    			add_location(div12, file$2, 118, 6, 3403);
    			attr_dev(button2, "class", "settings-button");
    			add_location(button2, file$2, 120, 8, 3481);
    			add_location(div13, file$2, 119, 6, 3467);
    			attr_dev(div14, "class", "flex flex-row items-center justify-between");
    			add_location(div14, file$2, 117, 4, 3340);
    			attr_dev(div15, "class", "mb-1");
    			add_location(div15, file$2, 115, 2, 3265);
    			attr_dev(div16, "class", "text-gray-200");
    			add_location(div16, file$2, 59, 0, 1471);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div16, anchor);
    			append_dev(div16, div4);
    			append_dev(div4, div0);
    			append_dev(div4, t1);
    			append_dev(div4, div3);
    			append_dev(div3, div1);
    			append_dev(div1, t2);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			append_dev(div2, button0);
    			append_dev(div2, t5);
    			append_dev(div2, button1);
    			append_dev(div16, t7);
    			append_dev(div16, div5);
    			append_dev(div16, t9);
    			append_dev(div16, div6);
    			append_dev(div6, label0);
    			append_dev(div6, t11);
    			append_dev(div6, input0);
    			append_dev(div16, t12);
    			append_dev(div16, div7);
    			append_dev(div16, t14);
    			append_dev(div16, div8);
    			append_dev(div8, label1);
    			append_dev(div8, t16);
    			append_dev(div8, input1);
    			append_dev(div16, t17);
    			append_dev(div16, div9);
    			append_dev(div16, t19);
    			append_dev(div16, div10);
    			if_block.m(div10, null);
    			append_dev(div16, t20);
    			append_dev(div16, div15);
    			append_dev(div15, div11);
    			append_dev(div15, t22);
    			append_dev(div15, div14);
    			append_dev(div14, div12);
    			append_dev(div12, t23);
    			append_dev(div14, t24);
    			append_dev(div14, div13);
    			append_dev(div13, button2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*setDownloadsFolder*/ ctx[7], false, false, false),
    					listen_dev(button1, "click", /*openDownloadsFolder*/ ctx[8], false, false, false),
    					listen_dev(input0, "input", /*toggleNotifications*/ ctx[10], false, false, false),
    					listen_dev(input1, "input", /*toggleOverwrite*/ ctx[9], false, false, false),
    					listen_dev(button2, "click", /*click_handler*/ ctx[13], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*downloadPathCleaned*/ 32) set_data_dev(t2, /*downloadPathCleaned*/ ctx[5]);

    			if (dirty & /*notifications*/ 2) {
    				prop_dev(input0, "checked", /*notifications*/ ctx[1]);
    			}

    			if (dirty & /*overwrite*/ 4) {
    				prop_dev(input1, "checked", /*overwrite*/ ctx[2]);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div10, null);
    				}
    			}

    			if (dirty & /*logPathCleaned*/ 64) set_data_dev(t23, /*logPathCleaned*/ ctx[6]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div16);
    			if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let downloadPathCleaned;
    	let logPathCleaned;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Settings", slots, []);
    	let downloadsFolder = "";
    	let logPath = "";
    	let notifications = false;
    	let overwrite = false;
    	let selfUpdate = false;
    	let packageManaged = false;

    	onMount(() => {
    		go.main.App.GetUserPrefs().then(prefs => {
    			$$invalidate(12, downloadsFolder = prefs.downloadsDirectory);
    			$$invalidate(1, notifications = prefs.notifications);
    			$$invalidate(2, overwrite = prefs.overwrite);
    			$$invalidate(3, selfUpdate = prefs.selfUpdate);
    		});

    		go.main.App.GetLogPath().then(path => {
    			$$invalidate(0, logPath = path);
    		});

    		go.main.App.AppInstalledFromPackageManager().then(managed => {
    			$$invalidate(4, packageManaged = managed);
    		});
    	});

    	function setDownloadsFolder() {
    		go.main.App.SetDownloadsFolder().then(folder => {
    			$$invalidate(12, downloadsFolder = folder);
    		});
    	}

    	function openDownloadsFolder() {
    		go.main.App.OpenFile(downloadsFolder);
    	}

    	function toggleOverwrite() {
    		go.main.App.SetOverwriteParam(!overwrite).then(newValue => {
    			$$invalidate(2, overwrite = newValue);
    		});
    	}

    	function toggleNotifications() {
    		go.main.App.SetNotificationsParam(!notifications).then(newValue => {
    			$$invalidate(1, notifications = newValue);
    		});
    	}

    	function toggleSelfUpdate() {
    		go.main.App.SetSelfUpdateParam(!selfUpdate).then(newValue => {
    			$$invalidate(3, selfUpdate = newValue);
    		});
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Settings> was created with unknown prop '${key}'`);
    	});

    	const click_handler = event => window.runtime.BrowserOpenURL(logPath);

    	$$self.$capture_state = () => ({
    		go,
    		onMount,
    		downloadsFolder,
    		logPath,
    		notifications,
    		overwrite,
    		selfUpdate,
    		packageManaged,
    		setDownloadsFolder,
    		openDownloadsFolder,
    		toggleOverwrite,
    		toggleNotifications,
    		toggleSelfUpdate,
    		downloadPathCleaned,
    		logPathCleaned
    	});

    	$$self.$inject_state = $$props => {
    		if ("downloadsFolder" in $$props) $$invalidate(12, downloadsFolder = $$props.downloadsFolder);
    		if ("logPath" in $$props) $$invalidate(0, logPath = $$props.logPath);
    		if ("notifications" in $$props) $$invalidate(1, notifications = $$props.notifications);
    		if ("overwrite" in $$props) $$invalidate(2, overwrite = $$props.overwrite);
    		if ("selfUpdate" in $$props) $$invalidate(3, selfUpdate = $$props.selfUpdate);
    		if ("packageManaged" in $$props) $$invalidate(4, packageManaged = $$props.packageManaged);
    		if ("downloadPathCleaned" in $$props) $$invalidate(5, downloadPathCleaned = $$props.downloadPathCleaned);
    		if ("logPathCleaned" in $$props) $$invalidate(6, logPathCleaned = $$props.logPathCleaned);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*downloadsFolder*/ 4096) {
    			$$invalidate(5, downloadPathCleaned = downloadsFolder.replace(/.{50}.\//g, "$&\n"));
    		}

    		if ($$self.$$.dirty & /*logPath*/ 1) {
    			$$invalidate(6, logPathCleaned = logPath.replace(/.{50}.\//g, "$&\n"));
    		}
    	};

    	return [
    		logPath,
    		notifications,
    		overwrite,
    		selfUpdate,
    		packageManaged,
    		downloadPathCleaned,
    		logPathCleaned,
    		setDownloadsFolder,
    		openDownloadsFolder,
    		toggleOverwrite,
    		toggleNotifications,
    		toggleSelfUpdate,
    		downloadsFolder,
    		click_handler
    	];
    }

    class Settings extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Settings",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/about.svelte generated by Svelte v3.38.3 */

    const { Object: Object_1 } = globals;

    const file$1 = "src/about.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i][0];
    	child_ctx[7] = list[i][1];
    	return child_ctx;
    }

    // (57:6) {#each Object.entries(attributions) as [name, url]}
    function create_each_block(ctx) {
    	let li;
    	let button;
    	let t_value = /*name*/ ctx[6] + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler_3(...args) {
    		return /*click_handler_3*/ ctx[5](/*url*/ ctx[7], ...args);
    	}

    	const block = {
    		c: function create() {
    			li = element("li");
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "text-blue-500");
    			add_location(button, file$1, 57, 12, 2088);
    			add_location(li, file$1, 57, 8, 2084);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, button);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler_3, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(57:6) {#each Object.entries(attributions) as [name, url]}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div4;
    	let div1;
    	let span;
    	let t0;
    	let t1;
    	let t2;
    	let div0;
    	let button0;
    	let t4;
    	let button1;
    	let t6;
    	let button2;
    	let t8;
    	let p0;
    	let t10;
    	let div2;
    	let p1;
    	let t12;
    	let p2;
    	let t14;
    	let div3;
    	let p3;
    	let t16;
    	let p4;
    	let t18;
    	let ul;
    	let mounted;
    	let dispose;
    	let each_value = Object.entries(/*attributions*/ ctx[1]);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div1 = element("div");
    			span = element("span");
    			t0 = text("Riftshare v");
    			t1 = text(/*version*/ ctx[0]);
    			t2 = space();
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "Website";
    			t4 = space();
    			button1 = element("button");
    			button1.textContent = "FAQ";
    			t6 = space();
    			button2 = element("button");
    			button2.textContent = "Open an Issue";
    			t8 = space();
    			p0 = element("p");
    			p0.textContent = "The goal of this project is to enable everyone to securely share files\n    freely and easily.";
    			t10 = space();
    			div2 = element("div");
    			p1 = element("p");
    			p1.textContent = "License";
    			t12 = space();
    			p2 = element("p");
    			p2.textContent = "Licensed under the GNU GPL Version 3";
    			t14 = space();
    			div3 = element("div");
    			p3 = element("p");
    			p3.textContent = "Attributions";
    			t16 = space();
    			p4 = element("p");
    			p4.textContent = "This project leverages the work of other Open Source Software";
    			t18 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(span, "class", "font-bold");
    			add_location(span, file$1, 28, 4, 1041);
    			attr_dev(button0, "class", "text-sm mr-1 about-button");
    			add_location(button0, file$1, 32, 4, 1117);
    			attr_dev(button1, "class", "text-sm mr-1 about-button");
    			add_location(button1, file$1, 35, 4, 1269);
    			attr_dev(button2, "class", "text-sm mr-1 about-button");
    			add_location(button2, file$1, 37, 4, 1421);
    			add_location(div0, file$1, 31, 4, 1107);
    			attr_dev(div1, "class", "flex flex-row justify-between");
    			add_location(div1, file$1, 27, 2, 993);
    			attr_dev(p0, "class", "text-sm mb-1");
    			add_location(p0, file$1, 42, 2, 1579);
    			attr_dev(p1, "class", "text-bold");
    			add_location(p1, file$1, 47, 2, 1732);
    			attr_dev(p2, "class", "text-sm");
    			add_location(p2, file$1, 48, 2, 1767);
    			attr_dev(div2, "class", "mb-1");
    			add_location(div2, file$1, 46, 2, 1711);
    			attr_dev(p3, "class", "text-bold");
    			add_location(p3, file$1, 51, 2, 1846);
    			attr_dev(p4, "class", "text-sm");
    			add_location(p4, file$1, 52, 4, 1888);
    			attr_dev(ul, "class", "text-xs file-list");
    			add_location(ul, file$1, 55, 4, 1987);
    			add_location(div3, file$1, 50, 2, 1838);
    			attr_dev(div4, "class", "container p4 text-gray-200");
    			add_location(div4, file$1, 26, 0, 950);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div1);
    			append_dev(div1, span);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(div1, t2);
    			append_dev(div1, div0);
    			append_dev(div0, button0);
    			append_dev(div0, t4);
    			append_dev(div0, button1);
    			append_dev(div0, t6);
    			append_dev(div0, button2);
    			append_dev(div4, t8);
    			append_dev(div4, p0);
    			append_dev(div4, t10);
    			append_dev(div4, div2);
    			append_dev(div2, p1);
    			append_dev(div2, t12);
    			append_dev(div2, p2);
    			append_dev(div4, t14);
    			append_dev(div4, div3);
    			append_dev(div3, p3);
    			append_dev(div3, t16);
    			append_dev(div3, p4);
    			append_dev(div3, t18);
    			append_dev(div3, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[2], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[3], false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[4], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*version*/ 1) set_data_dev(t1, /*version*/ ctx[0]);

    			if (dirty & /*window, Object, attributions*/ 2) {
    				each_value = Object.entries(/*attributions*/ ctx[1]);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const issueUrl = "https://github.com/achhabra2/riftshare/issues/new/choose";

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("About", slots, []);
    	let version = "";

    	const attributions = {
    		"wailsapp/wails": "https://wails.io",
    		"Jackalz/wails-wormhole-gui": "https://github.com/Jacalz/wormhole-gui",
    		"psanford/wormhole-william": "https://github.com/psanford/wormhole-william",
    		"magic-wormhole": "https://magic-wormhole.readthedocs.io/",
    		svelte: "https://github.com/sveltejs/svelte",
    		tailwindcss: "https://github.com/tailwindlabs/tailwindcss",
    		"font awesome": "https://fontawesome.com",
    		"klauspost/compress": "https://github.com/klauspost/compress",
    		"go-github-selfupdate": "https://github.com/rhysd/go-github-selfupdate"
    	};

    	onMount(() => {
    		go.main.App.GetCurrentVersion().then(ver => {
    			$$invalidate(0, version = ver);
    		});
    	});

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<About> was created with unknown prop '${key}'`);
    	});

    	const click_handler = event => window.runtime.BrowserOpenURL("https://riftshare.app");
    	const click_handler_1 = event => window.runtime.BrowserOpenURL("https://riftshare.app/faq.html");
    	const click_handler_2 = event => window.runtime.BrowserOpenURL(issueUrl);
    	const click_handler_3 = (url, event) => window.runtime.BrowserOpenURL(url);

    	$$self.$capture_state = () => ({
    		go,
    		onMount,
    		version,
    		issueUrl,
    		attributions
    	});

    	$$self.$inject_state = $$props => {
    		if ("version" in $$props) $$invalidate(0, version = $$props.version);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		version,
    		attributions,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3
    	];
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    function styleInject(css, ref) {
      if ( ref === void 0 ) ref = {};
      var insertAt = ref.insertAt;

      if (!css || typeof document === 'undefined') { return; }

      var head = document.head || document.getElementsByTagName('head')[0];
      var style = document.createElement('style');
      style.type = 'text/css';

      if (insertAt === 'top') {
        if (head.firstChild) {
          head.insertBefore(style, head.firstChild);
        } else {
          head.appendChild(style);
        }
      } else {
        head.appendChild(style);
      }

      if (style.styleSheet) {
        style.styleSheet.cssText = css;
      } else {
        style.appendChild(document.createTextNode(css));
      }
    }

    var css_248z = "/*! tailwindcss v3.0.9 | MIT License | https://tailwindcss.com*/*,:after,:before{border:0 solid;box-sizing:border-box}:after,:before{--tw-content:\"\"}html{-webkit-text-size-adjust:100%;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;line-height:1.5;-moz-tab-size:4;-o-tab-size:4;tab-size:4}body{line-height:inherit;margin:0}hr{border-top-width:1px;color:inherit;height:0}abbr:where([title]){-webkit-text-decoration:underline dotted;text-decoration:underline dotted}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;text-decoration:inherit}b,strong{font-weight:bolder}code,kbd,pre,samp{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,Courier New,monospace;font-size:1em}small{font-size:80%}sub,sup{font-size:75%;line-height:0;position:relative;vertical-align:baseline}sub{bottom:-.25em}sup{top:-.5em}table{border-collapse:collapse;border-color:inherit;text-indent:0}button,input,optgroup,select,textarea{color:inherit;font-family:inherit;font-size:100%;line-height:inherit;margin:0;padding:0}button,select{text-transform:none}[type=button],[type=reset],[type=submit],button{-webkit-appearance:button;background-color:transparent;background-image:none}:-moz-focusring{outline:auto}:-moz-ui-invalid{box-shadow:none}progress{vertical-align:baseline}::-webkit-inner-spin-button,::-webkit-outer-spin-button{height:auto}[type=search]{-webkit-appearance:textfield;outline-offset:-2px}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-file-upload-button{-webkit-appearance:button;font:inherit}summary{display:list-item}blockquote,dd,dl,figure,h1,h2,h3,h4,h5,h6,hr,p,pre{margin:0}fieldset{margin:0}fieldset,legend{padding:0}menu,ol,ul{list-style:none;margin:0;padding:0}textarea{resize:vertical}input::-moz-placeholder,textarea::-moz-placeholder{color:#94a3b8;opacity:1}input:-ms-input-placeholder,textarea:-ms-input-placeholder{color:#94a3b8;opacity:1}input::placeholder,textarea::placeholder{color:#94a3b8;opacity:1}[role=button],button{cursor:pointer}:disabled{cursor:default}audio,canvas,embed,iframe,img,object,svg,video{display:block;vertical-align:middle}img,video{height:auto;max-width:100%}[hidden]{display:none}[multiple],[type=date],[type=datetime-local],[type=email],[type=month],[type=number],[type=password],[type=search],[type=tel],[type=text],[type=time],[type=url],[type=week],select,textarea{--tw-shadow:0 0 #0000;-webkit-appearance:none;-moz-appearance:none;appearance:none;background-color:#fff;border-color:#64748b;border-radius:0;border-width:1px;font-size:1rem;line-height:1.5rem;padding:.5rem .75rem}[multiple]:focus,[type=date]:focus,[type=datetime-local]:focus,[type=email]:focus,[type=month]:focus,[type=number]:focus,[type=password]:focus,[type=search]:focus,[type=tel]:focus,[type=text]:focus,[type=time]:focus,[type=url]:focus,[type=week]:focus,select:focus,textarea:focus{--tw-ring-inset:var(--tw-empty,/*!*/ /*!*/);--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:#0891b2;--tw-ring-offset-shadow:var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow:var(--tw-ring-inset) 0 0 0 calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);border-color:#0891b2;box-shadow:var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow);outline:2px solid transparent;outline-offset:2px}input::-moz-placeholder,textarea::-moz-placeholder{color:#64748b;opacity:1}input:-ms-input-placeholder,textarea:-ms-input-placeholder{color:#64748b;opacity:1}input::placeholder,textarea::placeholder{color:#64748b;opacity:1}::-webkit-datetime-edit-fields-wrapper{padding:0}::-webkit-date-and-time-value{min-height:1.5em}select{-webkit-print-color-adjust:exact;background-image:url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E\");background-position:right .5rem center;background-repeat:no-repeat;background-size:1.5em 1.5em;color-adjust:exact;padding-right:2.5rem}[multiple]{-webkit-print-color-adjust:unset;background-image:none;background-position:0 0;background-repeat:unset;background-size:initial;color-adjust:unset;padding-right:.75rem}[type=checkbox],[type=radio]{-webkit-print-color-adjust:exact;--tw-shadow:0 0 #0000;-webkit-appearance:none;-moz-appearance:none;appearance:none;background-color:#fff;background-origin:border-box;border-color:#64748b;border-width:1px;color:#0891b2;color-adjust:exact;display:inline-block;flex-shrink:0;height:1rem;padding:0;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;vertical-align:middle;width:1rem}[type=checkbox]{border-radius:0}[type=radio]{border-radius:100%}[type=checkbox]:focus,[type=radio]:focus{--tw-ring-inset:var(--tw-empty,/*!*/ /*!*/);--tw-ring-offset-width:2px;--tw-ring-offset-color:#fff;--tw-ring-color:#0891b2;--tw-ring-offset-shadow:var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow:var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);box-shadow:var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow);outline:2px solid transparent;outline-offset:2px}[type=checkbox]:checked,[type=radio]:checked{background-color:currentColor;background-position:50%;background-repeat:no-repeat;background-size:100% 100%;border-color:transparent}[type=checkbox]:checked{background-image:url(\"data:image/svg+xml;charset=utf-8,%3Csvg viewBox='0 0 16 16' fill='%23fff' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12.207 4.793a1 1 0 0 1 0 1.414l-5 5a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L6.5 9.086l4.293-4.293a1 1 0 0 1 1.414 0z'/%3E%3C/svg%3E\")}[type=radio]:checked{background-image:url(\"data:image/svg+xml;charset=utf-8,%3Csvg viewBox='0 0 16 16' fill='%23fff' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='8' cy='8' r='3'/%3E%3C/svg%3E\")}[type=checkbox]:checked:focus,[type=checkbox]:checked:hover,[type=radio]:checked:focus,[type=radio]:checked:hover{background-color:currentColor;border-color:transparent}[type=checkbox]:indeterminate{background-color:currentColor;background-image:url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 16 16'%3E%3Cpath stroke='%23fff' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 8h8'/%3E%3C/svg%3E\");background-position:50%;background-repeat:no-repeat;background-size:100% 100%;border-color:transparent}[type=checkbox]:indeterminate:focus,[type=checkbox]:indeterminate:hover{background-color:currentColor;border-color:transparent}[type=file]{background:unset;border-color:inherit;border-radius:0;border-width:0;font-size:unset;line-height:inherit;padding:0}[type=file]:focus{outline:1px auto -webkit-focus-ring-color}*,:after,:before{--tw-border-opacity:1;--tw-ring-inset:var(--tw-empty,/*!*/ /*!*/);--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgba(6,182,212,.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;border-color:rgb(226 232 240/var(--tw-border-opacity))}.container{width:100%}@media (min-width:640px){.container{max-width:640px}}@media (min-width:768px){.container{max-width:768px}}@media (min-width:1024px){.container{max-width:1024px}}@media (min-width:1280px){.container{max-width:1280px}}@media (min-width:1536px){.container{max-width:1536px}}.open-button{--tw-bg-opacity:1;--tw-text-opacity:1;background-color:rgb(13 148 136/var(--tw-bg-opacity));border-radius:.5rem;color:rgb(226 232 240/var(--tw-text-opacity));padding:.25rem .5rem;transition-duration:.15s}.open-button:hover{--tw-bg-opacity:1;background-color:rgb(15 118 110/var(--tw-bg-opacity))}.open-button:active{--tw-bg-opacity:1;background-color:rgb(17 94 89/var(--tw-bg-opacity))}.send-input{--tw-bg-opacity:1;--tw-text-opacity:1;--tw-shadow:inset 0 2px 4px 0 rgba(0,0,0,.05);--tw-shadow-colored:inset 0 2px 4px 0 var(--tw-shadow-color);--tw-shadow:0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1);--tw-shadow-colored:0 4px 6px -1px var(--tw-shadow-color),0 2px 4px -2px var(--tw-shadow-color);background-color:rgb(51 65 85/var(--tw-bg-opacity));border-bottom-left-radius:.375rem;border-color:transparent;border-top-left-radius:.375rem;border-width:1px;box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow);color:rgb(226 232 240/var(--tw-text-opacity))}.send-input:focus{--tw-ring-offset-shadow:var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow:var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);--tw-ring-opacity:1;--tw-ring-color:rgb(94 234 212/var(--tw-ring-opacity));border-color:transparent;box-shadow:var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow,0 0 #0000);outline:2px solid transparent;outline-offset:2px}.send-input-label{--tw-text-opacity:1;color:rgb(203 213 225/var(--tw-text-opacity));display:block;font-size:.875rem;line-height:1.25rem}.send-button{--tw-bg-opacity:1;--tw-text-opacity:1;--tw-shadow:0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1);--tw-shadow-colored:0 4px 6px -1px var(--tw-shadow-color),0 2px 4px -2px var(--tw-shadow-color);background-color:rgb(13 148 136/var(--tw-bg-opacity));border-radius:.5rem;box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow);color:rgb(226 232 240/var(--tw-text-opacity));padding:.5rem 1rem;transition-duration:.15s}.send-button:hover{--tw-bg-opacity:1;background-color:rgb(15 118 110/var(--tw-bg-opacity))}.send-button:active{--tw-bg-opacity:1;background-color:rgb(17 94 89/var(--tw-bg-opacity))}.send-button:disabled{opacity:.5}.copy-button{--tw-bg-opacity:1;--tw-text-opacity:1;background-color:rgb(13 148 136/var(--tw-bg-opacity));border-bottom-right-radius:.375rem;border-top-right-radius:.375rem;color:rgb(226 232 240/var(--tw-text-opacity));padding:.5rem;transition-duration:.15s;width:2.5rem}.copy-button:hover{--tw-bg-opacity:1;background-color:rgb(15 118 110/var(--tw-bg-opacity))}.copy-button:active{--tw-bg-opacity:1;background-color:rgb(17 94 89/var(--tw-bg-opacity))}.copy-button:disabled{opacity:.5}.receive-input{--tw-bg-opacity:1;--tw-text-opacity:1;--tw-shadow:inset 0 2px 4px 0 rgba(0,0,0,.05);--tw-shadow-colored:inset 0 2px 4px 0 var(--tw-shadow-color);--tw-shadow:0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1);--tw-shadow-colored:0 4px 6px -1px var(--tw-shadow-color),0 2px 4px -2px var(--tw-shadow-color);background-color:rgb(30 41 59/var(--tw-bg-opacity));border-bottom-left-radius:.375rem;border-color:transparent;border-top-left-radius:.375rem;border-width:1px;box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow);color:rgb(226 232 240/var(--tw-text-opacity))}.receive-input:focus{--tw-ring-offset-shadow:var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow:var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);--tw-ring-opacity:1;--tw-ring-color:rgb(94 234 212/var(--tw-ring-opacity));border-color:transparent;box-shadow:var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow,0 0 #0000);outline:2px solid transparent;outline-offset:2px}.receive-input-label{--tw-text-opacity:1;color:rgb(203 213 225/var(--tw-text-opacity));display:block;font-size:.875rem;line-height:1.25rem}.receive-button{--tw-bg-opacity:1;--tw-text-opacity:1;--tw-shadow:0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1);--tw-shadow-colored:0 4px 6px -1px var(--tw-shadow-color),0 2px 4px -2px var(--tw-shadow-color);background-color:rgb(13 148 136/var(--tw-bg-opacity));border-bottom-right-radius:.375rem;border-top-right-radius:.375rem;box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow);color:rgb(226 232 240/var(--tw-text-opacity));padding:.5rem 1rem;transition-duration:.15s}.receive-button:hover{--tw-bg-opacity:1;background-color:rgb(15 118 110/var(--tw-bg-opacity))}.receive-button:active{--tw-bg-opacity:1;background-color:rgb(17 94 89/var(--tw-bg-opacity))}.receive-button:disabled{opacity:.5}.about-button{--tw-bg-opacity:1;--tw-text-opacity:1;--tw-shadow:0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1);--tw-shadow-colored:0 4px 6px -1px var(--tw-shadow-color),0 2px 4px -2px var(--tw-shadow-color);background-color:rgb(13 148 136/var(--tw-bg-opacity));border-radius:.375rem;box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow);color:rgb(226 232 240/var(--tw-text-opacity));padding:.25rem .5rem;transition-duration:.15s}.about-button:hover{--tw-bg-opacity:1;background-color:rgb(15 118 110/var(--tw-bg-opacity))}.about-button:active{--tw-bg-opacity:1;background-color:rgb(17 94 89/var(--tw-bg-opacity))}.send-icon-container{background-image:url(assets/images/upload-solid.svg)}.receive-icon-container,.send-icon-container{--tw-bg-opacity:0.75;background-color:rgb(19 78 74/var(--tw-bg-opacity));background-position:50%;background-repeat:no-repeat;background-size:60%}.receive-icon-container{background-image:url(assets/images/download-solid.svg)}.file-list{list-style-position:inside;list-style-type:disc}.cursor-fix{cursor:default}.tab-item{--tw-shadow:0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -4px rgba(0,0,0,.1);--tw-shadow-colored:0 10px 15px -3px var(--tw-shadow-color),0 4px 6px -4px var(--tw-shadow-color);border-radius:.25rem;box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow);display:block;display:flex;flex-direction:row;font-size:.75rem;font-weight:700;justify-content:center;line-height:1rem;line-height:1.5;padding:.75rem;text-transform:uppercase;width:7rem}.tab-item-inactive{--tw-bg-opacity:1;--tw-text-opacity:1;background-color:rgb(241 245 249/var(--tw-bg-opacity));color:rgb(17 94 89/var(--tw-text-opacity))}.tab-item-active{--tw-bg-opacity:1;--tw-text-opacity:1;background-color:rgb(17 94 89/var(--tw-bg-opacity));color:rgb(241 245 249/var(--tw-text-opacity))}.tab-container{width:100%}@media (min-width:640px){.tab-container{max-width:640px}}@media (min-width:768px){.tab-container{max-width:768px}}@media (min-width:1024px){.tab-container{max-width:1024px}}@media (min-width:1280px){.tab-container{max-width:1280px}}@media (min-width:1536px){.tab-container{max-width:1536px}}.tab-container{--tw-bg-opacity:0.5;--tw-shadow:0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -4px rgba(0,0,0,.1);--tw-shadow-colored:0 10px 15px -3px var(--tw-shadow-color),0 4px 6px -4px var(--tw-shadow-color);background-color:rgb(51 65 85/var(--tw-bg-opacity));border-radius:.5rem;box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow);height:82%;margin-left:auto;margin-right:auto;width:91.666667%;z-index:10}.progress-outer,.tab-container{padding:1rem}.progress-outer{--tw-bg-opacity:0.9;background-color:rgb(30 41 59/var(--tw-bg-opacity));bottom:0;height:100%;left:0;margin:auto;position:absolute;right:0;top:0;width:100%;z-index:0}.progress-inner{position:relative;top:33.333333%}.send-progress-old{margin-left:auto;margin-right:auto;padding:.5rem;width:75%}.icon{height:16px;width:16px}.icon,.icon-lg{background-repeat:no-repeat}.icon-lg{height:64px;width:64px}.copy-icon{background-repeat:no-repeat;height:1.5rem;-webkit-mask-image:url(assets/images/copy-regular.svg);mask-image:url(assets/images/copy-regular.svg);width:1.5rem}.copy-icon,.receive-tab-icon{--tw-bg-opacity:1;background-color:rgb(15 23 42/var(--tw-bg-opacity));-webkit-mask-position:center;mask-position:center;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}.receive-tab-icon{-webkit-mask-image:url(assets/images/download-solid.svg);mask-image:url(assets/images/download-solid.svg)}.send-tab-icon{-webkit-mask-image:url(assets/images/paper-plane-solid.svg);mask-image:url(assets/images/paper-plane-solid.svg)}.send-tab-icon,.settings-tab-icon{--tw-bg-opacity:1;background-color:rgb(15 23 42/var(--tw-bg-opacity));-webkit-mask-position:center;mask-position:center;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}.settings-tab-icon{-webkit-mask-image:url(assets/images/cog-solid.svg);mask-image:url(assets/images/cog-solid.svg)}.about-tab-icon{--tw-bg-opacity:1;background-color:rgb(15 23 42/var(--tw-bg-opacity));-webkit-mask-image:url(assets/images/info-circle-solid.svg);mask-image:url(assets/images/info-circle-solid.svg);-webkit-mask-position:center;mask-position:center;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}.send-file-icon{-webkit-mask-image:url(assets/images/file-upload-solid.svg);mask-image:url(assets/images/file-upload-solid.svg)}.receive-file-icon,.send-file-icon{--tw-bg-opacity:1;background-color:rgb(226 232 240/var(--tw-bg-opacity));-webkit-mask-position:center;mask-position:center;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}.receive-file-icon{-webkit-mask-image:url(assets/images/file-download-solid.svg);mask-image:url(assets/images/file-download-solid.svg)}.folder-select-icon{--tw-bg-opacity:1;--tw-shadow:0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1);--tw-shadow-colored:0 4px 6px -1px var(--tw-shadow-color),0 2px 4px -2px var(--tw-shadow-color);background-color:rgb(203 213 225/var(--tw-bg-opacity));box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow);content:\"\";display:block;height:6rem;-webkit-mask-image:url(assets/images/folder-regular.svg);mask-image:url(assets/images/folder-regular.svg);-webkit-mask-position:center;mask-position:center;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-size:contain;mask-size:contain;transition-duration:.3s;width:6rem}.folder-select-icon:hover{--tw-bg-opacity:1;background-color:rgb(20 184 166/var(--tw-bg-opacity))}.file-select-icon{--tw-bg-opacity:1;--tw-shadow:0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1);--tw-shadow-colored:0 4px 6px -1px var(--tw-shadow-color),0 2px 4px -2px var(--tw-shadow-color);background-color:rgb(203 213 225/var(--tw-bg-opacity));box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow);content:\"\";display:block;height:6rem;-webkit-mask-image:url(assets/images/file-regular.svg);mask-image:url(assets/images/file-regular.svg);-webkit-mask-position:center;mask-position:center;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-size:contain;mask-size:contain;transition-duration:.3s;width:6rem}.file-select-icon:hover{--tw-bg-opacity:1;background-color:rgb(20 184 166/var(--tw-bg-opacity))}.cancel-button{--tw-bg-opacity:1;--tw-text-opacity:1;background-color:rgb(153 27 27/var(--tw-bg-opacity));border-radius:.5rem;color:rgb(226 232 240/var(--tw-text-opacity));padding:.5rem 1rem;transition-duration:.15s}.cancel-button:hover{--tw-bg-opacity:1;background-color:rgb(185 28 28/var(--tw-bg-opacity))}.cancel-button:active{--tw-bg-opacity:1;background-color:rgb(127 29 29/var(--tw-bg-opacity))}.cancel-button:disabled{opacity:.5}.tooltip{--tw-border-opacity:1;--tw-bg-opacity:1;--tw-text-opacity:1;--tw-shadow:0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -4px rgba(0,0,0,.1);--tw-shadow-colored:0 10px 15px -3px var(--tw-shadow-color),0 4px 6px -4px var(--tw-shadow-color);background-color:rgb(226 232 240/var(--tw-bg-opacity));border-color:rgb(15 118 110/var(--tw-border-opacity));border-radius:.25rem;border-width:1px;box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow);color:rgb(30 41 59/var(--tw-text-opacity));font-size:.875rem;line-height:1.25rem;margin-top:-2rem;padding:.25rem;position:absolute;visibility:hidden}.has-tooltip:hover .tooltip{visibility:visible;z-index:50}.checkbox{--tw-border-opacity:1;--tw-bg-opacity:1;background-color:rgb(15 118 110/var(--tw-bg-opacity));border-color:rgb(203 213 225/var(--tw-border-opacity));border-radius:.25rem;border-width:1px;height:1rem;width:1rem}.checkbox:focus{--tw-ring-offset-shadow:var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow:var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);--tw-ring-opacity:1;--tw-ring-color:rgb(94 234 212/var(--tw-ring-opacity));box-shadow:var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow,0 0 #0000)}.settings-button{--tw-bg-opacity:1;--tw-text-opacity:1;background-color:rgb(13 148 136/var(--tw-bg-opacity));border-radius:.5rem;color:rgb(226 232 240/var(--tw-text-opacity));font-size:.875rem;line-height:1.25rem;padding:.25rem;transition-duration:.15s}.settings-button:hover{--tw-bg-opacity:1;background-color:rgb(15 118 110/var(--tw-bg-opacity))}.settings-button:active{--tw-bg-opacity:1;background-color:rgb(17 94 89/var(--tw-bg-opacity))}.settings-button:disabled{opacity:.5}.visible{visibility:visible}.invisible{visibility:hidden}.absolute{position:absolute}.relative{position:relative}.inset-0{bottom:0;left:0;right:0;top:0}.z-0{z-index:0}.m-2{margin:.5rem}.mx-auto{margin-left:auto;margin-right:auto}.my-auto{margin-bottom:auto;margin-top:auto}.my-2{margin-bottom:.5rem;margin-top:.5rem}.-mt-8{margin-top:-2rem}.mr-1{margin-right:.25rem}.mb-1{margin-bottom:.25rem}.mt-2{margin-top:.5rem}.mt-1{margin-top:.25rem}.ml-1{margin-left:.25rem}.mb-2{margin-bottom:.5rem}.block{display:block}.inline-block{display:inline-block}.flex{display:flex}.inline-flex{display:inline-flex}.grid{display:grid}.h-24{height:6rem}.h-4{height:1rem}.h-56{height:14rem}.h-full{height:100%}.h-36{height:9rem}.w-28{width:7rem}.w-11\\/12{width:91.666667%}.w-full{width:100%}.w-24{width:6rem}.w-4{width:1rem}.w-72{width:18rem}.w-60{width:15rem}.max-w-md{max-width:28rem}@-webkit-keyframes pulse{50%{opacity:.5}}@keyframes pulse{50%{opacity:.5}}.animate-pulse{-webkit-animation:pulse 2s cubic-bezier(.4,0,.6,1) infinite;animation:pulse 2s cubic-bezier(.4,0,.6,1) infinite}.list-disc{list-style-type:disc}.grid-flow-row{grid-auto-flow:row}.flex-row{flex-direction:row}.flex-col{flex-direction:column}.place-items-center{place-items:center}.content-center{align-content:center}.items-center{align-items:center}.justify-center{justify-content:center}.justify-between{justify-content:space-between}.justify-around{justify-content:space-around}.justify-items-center{justify-items:center}.space-x-1>:not([hidden])~:not([hidden]){--tw-space-x-reverse:0;margin-left:calc(.25rem*(1 - var(--tw-space-x-reverse)));margin-right:calc(.25rem*var(--tw-space-x-reverse))}.space-x-2>:not([hidden])~:not([hidden]){--tw-space-x-reverse:0;margin-left:calc(.5rem*(1 - var(--tw-space-x-reverse)));margin-right:calc(.5rem*var(--tw-space-x-reverse))}.space-y-2>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-bottom:calc(.5rem*var(--tw-space-y-reverse));margin-top:calc(.5rem*(1 - var(--tw-space-y-reverse)))}.rounded-lg{border-radius:.5rem}.rounded-md{border-radius:.375rem}.rounded{border-radius:.25rem}.rounded-full{border-radius:9999px}.rounded-l-md{border-bottom-left-radius:.375rem;border-top-left-radius:.375rem}.rounded-r-md{border-bottom-right-radius:.375rem;border-top-right-radius:.375rem}.border{border-width:1px}.border-2{border-width:2px}.border-transparent{border-color:transparent}.border-green-700{--tw-border-opacity:1;border-color:rgb(15 118 110/var(--tw-border-opacity))}.border-gray-300{--tw-border-opacity:1;border-color:rgb(203 213 225/var(--tw-border-opacity))}.border-green-300{--tw-border-opacity:1;border-color:rgb(94 234 212/var(--tw-border-opacity))}.bg-green-600{--tw-bg-opacity:1;background-color:rgb(13 148 136/var(--tw-bg-opacity))}.bg-gray-700{--tw-bg-opacity:1;background-color:rgb(51 65 85/var(--tw-bg-opacity))}.bg-gray-800{--tw-bg-opacity:1;background-color:rgb(30 41 59/var(--tw-bg-opacity))}.bg-green-900{--tw-bg-opacity:1;background-color:rgb(19 78 74/var(--tw-bg-opacity))}.bg-gray-300{--tw-bg-opacity:1;background-color:rgb(203 213 225/var(--tw-bg-opacity))}.bg-red-800{--tw-bg-opacity:1;background-color:rgb(153 27 27/var(--tw-bg-opacity))}.bg-gray-200{--tw-bg-opacity:1;background-color:rgb(226 232 240/var(--tw-bg-opacity))}.bg-green-700{--tw-bg-opacity:1;background-color:rgb(15 118 110/var(--tw-bg-opacity))}.bg-purple-500{--tw-bg-opacity:1;background-color:rgb(139 92 246/var(--tw-bg-opacity))}.bg-green-500{--tw-bg-opacity:1;background-color:rgb(20 184 166/var(--tw-bg-opacity))}.bg-opacity-50{--tw-bg-opacity:0.5}.bg-opacity-90{--tw-bg-opacity:0.9}.bg-opacity-60{--tw-bg-opacity:0.6}.bg-center{background-position:50%}.bg-no-repeat{background-repeat:no-repeat}.p-2{padding:.5rem}.p-1{padding:.25rem}.px-2{padding-left:.5rem;padding-right:.5rem}.py-1{padding-bottom:.25rem;padding-top:.25rem}.px-4{padding-left:1rem;padding-right:1rem}.py-2{padding-bottom:.5rem;padding-top:.5rem}.px-3{padding-left:.75rem;padding-right:.75rem}.py-3{padding-bottom:.75rem;padding-top:.75rem}.py-4{padding-bottom:1rem;padding-top:1rem}.px-1{padding-left:.25rem;padding-right:.25rem}.py-8{padding-bottom:2rem;padding-top:2rem}.pt-2{padding-top:.5rem}.pb-2{padding-bottom:.5rem}.text-center{text-align:center}.font-sans{font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji}.text-sm{font-size:.875rem;line-height:1.25rem}.text-xs{font-size:.75rem;line-height:1rem}.text-base{font-size:1rem;line-height:1.5rem}.font-bold{font-weight:700}.font-medium{font-weight:500}.uppercase{text-transform:uppercase}.leading-normal{line-height:1.5}.text-gray-200{--tw-text-opacity:1;color:rgb(226 232 240/var(--tw-text-opacity))}.text-green-800{--tw-text-opacity:1;color:rgb(17 94 89/var(--tw-text-opacity))}.text-gray-100{--tw-text-opacity:1;color:rgb(241 245 249/var(--tw-text-opacity))}.text-gray-800{--tw-text-opacity:1;color:rgb(30 41 59/var(--tw-text-opacity))}.text-white{--tw-text-opacity:1;color:rgb(255 255 255/var(--tw-text-opacity))}.text-blue-500{--tw-text-opacity:1;color:rgb(6 182 212/var(--tw-text-opacity))}.text-gray-400{--tw-text-opacity:1;color:rgb(148 163 184/var(--tw-text-opacity))}.text-gray-300{--tw-text-opacity:1;color:rgb(203 213 225/var(--tw-text-opacity))}.shadow-inner{--tw-shadow:inset 0 2px 4px 0 rgba(0,0,0,.05);--tw-shadow-colored:inset 0 2px 4px 0 var(--tw-shadow-color)}.shadow-inner,.shadow-md{box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.shadow-md{--tw-shadow:0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1);--tw-shadow-colored:0 4px 6px -1px var(--tw-shadow-color),0 2px 4px -2px var(--tw-shadow-color)}.shadow-lg{--tw-shadow:0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -4px rgba(0,0,0,.1);--tw-shadow-colored:0 10px 15px -3px var(--tw-shadow-color),0 4px 6px -4px var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.duration-150{transition-duration:.15s}.duration-300{transition-duration:.3s}main{height:100%;width:100%}div{overscroll:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.hover\\:bg-green-700:hover{--tw-bg-opacity:1;background-color:rgb(15 118 110/var(--tw-bg-opacity))}.hover\\:bg-green-500:hover{--tw-bg-opacity:1;background-color:rgb(20 184 166/var(--tw-bg-opacity))}.hover\\:bg-red-700:hover{--tw-bg-opacity:1;background-color:rgb(185 28 28/var(--tw-bg-opacity))}.focus\\:border-transparent:focus{border-color:transparent}.focus\\:outline-none:focus{outline:2px solid transparent;outline-offset:2px}.focus\\:ring-2:focus{--tw-ring-offset-shadow:var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow:var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);box-shadow:var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow,0 0 #0000)}.focus\\:ring-green-300:focus{--tw-ring-opacity:1;--tw-ring-color:rgb(94 234 212/var(--tw-ring-opacity))}.active\\:bg-green-800:active{--tw-bg-opacity:1;background-color:rgb(17 94 89/var(--tw-bg-opacity))}.disabled\\:opacity-50:disabled{opacity:.5}";
    styleInject(css_248z);

    /* src/App.svelte generated by Svelte v3.38.3 */
    const file = "src/App.svelte";

    // (94:33) 
    function create_if_block_3(ctx) {
    	let about;
    	let current;
    	about = new About({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(about.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(about, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(about.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(about.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(about, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(94:33) ",
    		ctx
    	});

    	return block;
    }

    // (92:36) 
    function create_if_block_2(ctx) {
    	let settings;
    	let current;
    	settings = new Settings({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(settings.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(settings, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(settings.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(settings.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(settings, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(92:36) ",
    		ctx
    	});

    	return block;
    }

    // (90:35) 
    function create_if_block_1(ctx) {
    	let receiver;
    	let current;
    	receiver = new Receiver({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(receiver.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(receiver, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(receiver.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(receiver.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(receiver, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(90:35) ",
    		ctx
    	});

    	return block;
    }

    // (88:4) {#if appMode == "send"}
    function create_if_block(ctx) {
    	let sender;
    	let current;
    	sender = new Sender({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(sender.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(sender, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(sender.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(sender.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(sender, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(88:4) {#if appMode == \\\"send\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div4;
    	let ul;
    	let li0;
    	let button0;
    	let div0;
    	let t0;
    	let span0;
    	let button0_class_value;
    	let t2;
    	let li1;
    	let button1;
    	let div1;
    	let t3;
    	let span1;
    	let button1_class_value;
    	let t5;
    	let li2;
    	let button2;
    	let div2;
    	let t6;
    	let span2;
    	let button2_class_value;
    	let t8;
    	let li3;
    	let button3;
    	let div3;
    	let t9;
    	let span3;
    	let button3_class_value;
    	let t11;
    	let div5;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	let mounted;
    	let dispose;
    	const if_block_creators = [create_if_block, create_if_block_1, create_if_block_2, create_if_block_3];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*appMode*/ ctx[0] == "send") return 0;
    		if (/*appMode*/ ctx[0] == "receive") return 1;
    		if (/*appMode*/ ctx[0] == "settings") return 2;
    		if (/*appMode*/ ctx[0] == "about") return 3;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			div4 = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			button0 = element("button");
    			div0 = element("div");
    			t0 = space();
    			span0 = element("span");
    			span0.textContent = "Send";
    			t2 = space();
    			li1 = element("li");
    			button1 = element("button");
    			div1 = element("div");
    			t3 = space();
    			span1 = element("span");
    			span1.textContent = "Receive";
    			t5 = space();
    			li2 = element("li");
    			button2 = element("button");
    			div2 = element("div");
    			t6 = space();
    			span2 = element("span");
    			span2.textContent = "Settings";
    			t8 = space();
    			li3 = element("li");
    			button3 = element("button");
    			div3 = element("div");
    			t9 = space();
    			span3 = element("span");
    			span3.textContent = "About";
    			t11 = space();
    			div5 = element("div");
    			if (if_block) if_block.c();
    			attr_dev(div0, "class", "icon send-tab-icon mr-1");
    			add_location(div0, file, 22, 10, 713);
    			add_location(span0, file, 23, 10, 763);

    			attr_dev(button0, "class", button0_class_value = /*appMode*/ ctx[0] == "send"
    			? "tab-item tab-item-active"
    			: "tab-item tab-item-inactive");

    			add_location(button0, file, 16, 8, 519);
    			attr_dev(li0, "class", "");
    			add_location(li0, file, 15, 6, 497);
    			attr_dev(div1, "class", "icon receive-tab-icon mr-1");
    			add_location(div1, file, 33, 10, 1039);
    			add_location(span1, file, 34, 10, 1092);

    			attr_dev(button1, "class", button1_class_value = /*appMode*/ ctx[0] == "receive"
    			? "tab-item tab-item-active"
    			: "tab-item tab-item-inactive");

    			add_location(button1, file, 27, 8, 839);
    			attr_dev(li1, "class", "");
    			add_location(li1, file, 26, 6, 817);
    			attr_dev(div2, "class", "icon settings-tab-icon mr-1");
    			add_location(div2, file, 44, 10, 1373);
    			add_location(span2, file, 45, 10, 1427);

    			attr_dev(button2, "class", button2_class_value = /*appMode*/ ctx[0] == "settings"
    			? "tab-item tab-item-active"
    			: "tab-item tab-item-inactive");

    			add_location(button2, file, 38, 8, 1171);
    			attr_dev(li2, "class", "");
    			add_location(li2, file, 37, 6, 1149);
    			attr_dev(div3, "class", "icon about-tab-icon mr-1");
    			add_location(div3, file, 55, 10, 1703);
    			add_location(span3, file, 56, 10, 1754);

    			attr_dev(button3, "class", button3_class_value = /*appMode*/ ctx[0] == "about"
    			? "tab-item tab-item-active"
    			: "tab-item tab-item-inactive");

    			add_location(button3, file, 49, 8, 1507);
    			attr_dev(li3, "class", "");
    			add_location(li3, file, 48, 6, 1485);
    			attr_dev(ul, "class", "flex justify-center space-x-1 flex-row");
    			add_location(ul, file, 14, 4, 439);
    			attr_dev(div4, "class", "container mx-auto py-1");
    			add_location(div4, file, 13, 2, 398);
    			attr_dev(div5, "class", "tab-container");
    			add_location(div5, file, 86, 2, 2570);
    			attr_dev(main, "data-wails-no-drag", "");
    			add_location(main, file, 9, 0, 257);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div4);
    			append_dev(div4, ul);
    			append_dev(ul, li0);
    			append_dev(li0, button0);
    			append_dev(button0, div0);
    			append_dev(button0, t0);
    			append_dev(button0, span0);
    			append_dev(ul, t2);
    			append_dev(ul, li1);
    			append_dev(li1, button1);
    			append_dev(button1, div1);
    			append_dev(button1, t3);
    			append_dev(button1, span1);
    			append_dev(ul, t5);
    			append_dev(ul, li2);
    			append_dev(li2, button2);
    			append_dev(button2, div2);
    			append_dev(button2, t6);
    			append_dev(button2, span2);
    			append_dev(ul, t8);
    			append_dev(ul, li3);
    			append_dev(li3, button3);
    			append_dev(button3, div3);
    			append_dev(button3, t9);
    			append_dev(button3, span3);
    			append_dev(main, t11);
    			append_dev(main, div5);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(div5, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[1], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[2], false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[3], false, false, false),
    					listen_dev(button3, "click", /*click_handler_3*/ ctx[4], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*appMode*/ 1 && button0_class_value !== (button0_class_value = /*appMode*/ ctx[0] == "send"
    			? "tab-item tab-item-active"
    			: "tab-item tab-item-inactive")) {
    				attr_dev(button0, "class", button0_class_value);
    			}

    			if (!current || dirty & /*appMode*/ 1 && button1_class_value !== (button1_class_value = /*appMode*/ ctx[0] == "receive"
    			? "tab-item tab-item-active"
    			: "tab-item tab-item-inactive")) {
    				attr_dev(button1, "class", button1_class_value);
    			}

    			if (!current || dirty & /*appMode*/ 1 && button2_class_value !== (button2_class_value = /*appMode*/ ctx[0] == "settings"
    			? "tab-item tab-item-active"
    			: "tab-item tab-item-inactive")) {
    				attr_dev(button2, "class", button2_class_value);
    			}

    			if (!current || dirty & /*appMode*/ 1 && button3_class_value !== (button3_class_value = /*appMode*/ ctx[0] == "about"
    			? "tab-item tab-item-active"
    			: "tab-item tab-item-inactive")) {
    				attr_dev(button3, "class", button3_class_value);
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}

    					transition_in(if_block, 1);
    					if_block.m(div5, null);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d();
    			}

    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let appMode = "send";
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(0, appMode = "send");
    	const click_handler_1 = () => $$invalidate(0, appMode = "receive");
    	const click_handler_2 = () => $$invalidate(0, appMode = "settings");
    	const click_handler_3 = () => $$invalidate(0, appMode = "about");

    	$$self.$capture_state = () => ({
    		Sender,
    		Receiver,
    		Settings,
    		About,
    		appMode
    	});

    	$$self.$inject_state = $$props => {
    		if ("appMode" in $$props) $$invalidate(0, appMode = $$props.appMode);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [appMode, click_handler, click_handler_1, click_handler_2, click_handler_3];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
