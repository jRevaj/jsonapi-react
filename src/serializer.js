import { isObject, coerceValue } from './functions'

const createResourceKey = (type, id) => `${type}:${id}`

const createFieldsCache = (schema) => {
  const cache = new Map()
  for (const [type, { fields, type: schemaType }] of Object.entries(schema)) {
    cache.set(type, {
      fields,
      isArray: Array.isArray(schemaType),
      types: Array.isArray(schemaType) ? new Set(schemaType) : null
    })
  }
  return cache
}

export class Serializer {
  constructor({ schema } = {}) {
    this.schema = schema || {}
    this.fieldsCache = createFieldsCache(this.schema)
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

    if (res.error || res.errors) {
      if (res.error) {
        return isObject(res.error) ? res : {
          error: {
            status: String(res.status || 400),
            title: res.error,
            message: res.error,
          },
        }
      }
      const error = res.errors.find(e => e.status !== '422')
      return error ? { error } : { errors: res.errors }
    }

    if (!res.data) return res

    const { data, included = [], ...rest } = res
    const isArrayData = Array.isArray(data)
    const records = isArrayData ? [...data, ...included] : [data, ...included]
    
    const processedDataMap = new Map()
    
    const processedData = new Array(records.length)
    for (let i = 0; i < records.length; i++) {
      const rec = records[i]
      const attrs = {
        id: rec.id,
        ...rec.attributes,
        ...(rec.meta != null && { meta: rec.meta })
      }

      for (const [type, { fields, isArray, types }] of this.fieldsCache) {
        if (isArray ? types.has(rec.type) : type === rec.type) {
          this.processTypeFields(attrs, fields, rec.type)
          this.processNonTypeFields(attrs, fields, rec)
        }
      }

      const processed = { ...rec, attributes: attrs }
      const key = createResourceKey(rec.type, rec.id)
      processedDataMap.set(key, processed)
      processedData[i] = processed
    }

    for (const rec of processedData) {
      if (!rec.relationships) continue

      for (const [key, { data: rel }] of Object.entries(rec.relationships)) {
        if (!rel) continue

        if (Array.isArray(rel)) {
          const relAttrs = new Array(rel.length)
          let validCount = 0
          for (let i = 0; i < rel.length; i++) {
            const r = rel[i]
            const child = processedDataMap.get(createResourceKey(r.type, r.id))
            if (child) {
              relAttrs[validCount++] = child.attributes
            }
          }
          rec.attributes[key] = validCount === rel.length ? relAttrs : relAttrs.slice(0, validCount)
        } else {
          const child = processedDataMap.get(createResourceKey(rel.type, rel.id))
          rec.attributes[key] = child ? child.attributes : null
        }
      }
    }

    if (isArrayData) {
      const dataKeys = new Set(data.map(d => createResourceKey(d.type, d.id)))
      return {
        data: processedData
          .filter(rec => dataKeys.has(createResourceKey(rec.type, rec.id)))
          .map(({ attributes, meta }) => ({ ...attributes, meta })),
        ...rest
      }
    }

    const record = processedDataMap.get(createResourceKey(data.type, data.id))
    return {
      data: record ? { ...record.attributes, meta: record.meta } : null,
      ...rest
    }
  }

  processTypeFields(attrs, typeFields, parentType) {
    Object.entries(typeFields)
      .filter(([_, ref]) => ref === 'type' || ref?.type === 'type')
      .forEach(([field, ref]) => {
        attrs[field] = coerceValue(attrs[field], 'type', {
          parentType,
          field: ref
        })
      })
  }

  processNonTypeFields(attrs, typeFields, rec) {
    Object.entries(typeFields)
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
}
