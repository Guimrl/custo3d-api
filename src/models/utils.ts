import lodash from "lodash";

export const schemaOptions = {
  timestamps: true,
  versionKey: false as const, // o Mongoose aceita só o literal false, não qualquer boolean
  toJSON: {
    virtuals: true,
    transform: (_document: unknown, json: Record<string, unknown>) =>
      lodash.omit(json, "_id"),
  },
};

/** Campo numérico não negativo, com padrão 0 (sobrescrevível). */
export const numberField = (extra: Record<string, unknown> = {}) => ({
  type: Number,
  default: 0,
  min: 0,
  ...extra,
});

/** Link da foto (http/https). Vazio = sem foto. */
export const photoUrl = {
  type: String,
  trim: true,
  match: [
    /^(https?:\/\/\S+)?$/i,
    "A foto precisa ser um link começando com http:// ou https://.",
  ] as [RegExp, string],
};
