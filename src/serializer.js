import { isObject, coerceValue, toArray } from './functions'

export class Serializer {
  constructor({ schema } = {}) {
    this.schema = schema || {}
  }

  serialize(type, attrs) {
    if (!attrs) {
      return { type, data: null }
    }

    if (Array.isArray(attrs)) {
      return { data: attrs.map(rec => this.parseResource(type, rec)) }
    }

    return {
      data: this.parseResource(type, attrs),
    }
  }

  parseResource(type, attrs = {}) {
    if (!attrs) {
      return null
    }

    attrs = { ...attrs }

    if (attrs._type) {
      type = attrs._type
      delete attrs._type
    }

    const data = { type }
    const rels = {}

    if (attrs.id) {
      data.id = String(attrs.id)
      delete attrs.id
    }

    const config = this.schema[type]
    if (!config) {
      return { ...data, attributes: attrs }
    }

    for (let field in config.relationships) {
      if (attrs[field] === undefined) {
        continue
      }

      const ref = config.relationships[field]
      const val = attrs[field]

      delete attrs[field]

      const relType = ref.type || (ref.getType ? ref.getType(attrs) : null)

      if (!ref.readOnly) {
        if (Array.isArray(val)) {
          rels[field] = {
            data: val.map(v => this.parseRelationship(relType, v)),
          }
        } else {
          rels[field] = {
            data: this.parseRelationship(relType, val),
          }
        }
      }
    }

    for (let field in config.fields) {
      if (config.fields[field].readOnly) {
        delete attrs[field]
      } else if (attrs[field] !== undefined && config.fields[field].serialize) {
        attrs[field] = config.fields[field].serialize(attrs[field], attrs)
      }
    }

    if (Object.entries(attrs).length) {
      data.attributes = attrs
    }

    if (Object.entries(rels).length) {
      data.relationships = rels
    }

    return data
  }

  parseRelationship(type, attrs) {
    const res = this.parseResource(type, attrs)
    return { type: res.type, id: res.id || null }
  }

  deserialize(res) {
    if (!res) return null

    if (res.error) {
      return isObject(res.error) ? res : {
        error: {
          status: String(res.status || 400),
          title: res.error,
          message: res.error,
        },
      }
    }

    if (res.errors) {
      const error = res.errors.find(e => e.status !== '422')
      return error ? { error } : { errors: res.errors }
    }

    if (!res.data) return res

    let { data, included, ...rest } = res
    const records = [...toArray(data), ...(included || [])]

    const fields = Object.fromEntries(
      Object.keys(this.schema).map(ref => [ref, this.schema[ref].fields])
    )

    const processedData = records.map(rec => {
      const attrs = {
        id: rec.id,
        ...rec.attributes,
        meta: rec.meta,
      }

      if (fields[rec.type]) {
        Object.entries(fields[rec.type])
          .filter(([_, ref]) => ref === 'type' || ref?.type === 'type')
          .forEach(([field, ref]) => {
            attrs[field] = coerceValue(attrs[field], 'type', {
              parentType: rec.type,
              field: ref
            })
          })

        Object.entries(fields[rec.type])
          .filter(([_, ref]) => ref !== 'type' && ref?.type !== 'type')
          .forEach(([field, ref]) => {
            if (attrs[field] !== undefined || typeof ref?.resolve === 'function') {
              if (ref.type) {
                attrs[field] = coerceValue(attrs[field], ref.type, {
                  parentType: rec.type,
                  field: ref
                })
              }
              if (typeof ref?.resolve === 'function') {
                attrs[field] = ref.resolve(attrs[field], attrs, rec)
              }
            }
          })
      }

      return { ...rec, attributes: attrs }
    })

    processedData.forEach(rec => {
      if (!rec.relationships) return

      Object.entries(rec.relationships).forEach(([key, { data: rel }]) => {
        if (!rel) return

        if (Array.isArray(rel)) {
          rec.attributes[key] = rel
            .map(r => processedData.find(d => d.type === r.type && d.id === r.id))
            .filter(Boolean)
            .map(r => r.attributes)
        } else {
          const child = processedData.find(r => r.type === rel.type && r.id === rel.id)
          rec.attributes[key] = child ? child.attributes : null
        }
      })
    })

    const finalData = Array.isArray(res.data)
      ? processedData
          .filter(rec => res.data.some(r => r.id === rec.id && r.type === rec.type))
          .map(rec => ({ ...rec.attributes, meta: rec.meta }))
      : (() => {
          const record = processedData.find(r => r.id === res.data.id)
          return record ? { ...record.attributes, meta: record.meta } : null
        })()

    return { data: finalData, ...rest }
  }
}
