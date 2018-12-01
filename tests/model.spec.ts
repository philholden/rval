import { val } from "./rval"

const $factory = Symbol("$factory")

function model(factory, key?) {
    return function preProcessor(newValue, currentValue?) {
        if (newValue == null) return newValue
        if (typeof newValue !== "object") throw new Error("Model expects null, undefined or an object")
        if (newValue[$factory]) {
            if (newValue[$factory] !== factory) throw new Error(`Factory mismatch`)
            return newValue
        }
        if (key && newValue[key] === undefined) throw new Error(`Attribute '${key}' is required`)
        const reconcilable = currentValue && (!key || newValue[key] === currentValue[key])
        const base = reconcilable ? currentValue : Object.assign(factory(), { [$factory]: factory })
        // update props
        for(let prop in newValue) {
            if (prop === key) continue
            if (typeof base[prop] !== "function") // TODO: isVal
                throw new Error("Not an assignable property: " + prop)
            base[prop](newValue[prop])
        }
        return base
    }
}

test("simple model", () => {
    const Todo = model(() => ({
        title: val('test')
    }))

    expect(() => {
        Todo(3)
    }).toThrow("Model expects null, undefined or an object")
    expect(Todo(null)).toBe(null)
    expect(Todo(undefined)).toBe(undefined)
    expect(Todo({}).title()).toBe("test")
    expect(Todo({ title: "hello" }).title()).toBe("hello")
    expect(() => {
        Todo({ title: "test", bla: 3})
    }).toThrow("bla")
    expect(Todo(null, {})).toBe(null)
    expect(Todo({title: "xx"}, undefined).title()).toEqual("xx")

    const t1 = Todo({ title: "hello" })
    const t2 = Todo({ title: "world"}, t1)
    expect(t1).toBe(t2)
    expect(t2.title()).toBe("world")

    const t3 = Todo({ title: "hello" })
    const t4 = Todo(Todo({ title: "world"}), t3)
    expect(t3).not.toBe(t4)
    expect(t3.title()).toBe("hello")
    expect(t4.title()).toBe("world")
})

test("simple model - with key", () => {
    const Todo = model(() => ({
        id: 0,
        title: val('test')
    }), "id")

    expect(() => {
        Todo({})
    }).toThrow("required")

    {
        const t1 = Todo({ id: 0, title: "hello" })
        const t2 = Todo({ id: 0, title: "world"}, t1)
        expect(t1).toBe(t2)
        expect(t2.title()).toBe("world")
    }
    {
        const t1 = Todo({ id: 0, title: "hello" })
        const t2 = Todo({ id: 1, title: "world"}, t1)
        expect(t1).not.toBe(t2)
        expect(t1.title()).toBe("hello")
        expect(t2.title()).toBe("world")
    }
    {
        const t1 = Todo({ id: 0, title: "hello" })
        const t2 = Todo(Todo({ id: 0, title: "world"}), t1)
        expect(t1).not.toBe(t2)
        expect(t1.title()).toBe("hello")
        expect(t2.title()).toBe("world")
    }
})
