export const schemaOptions = {
  timestamps: true,
  versionKey: false as const, // "as const": o Mongoose aceita só o literal false, não qualquer boolean
  toJSON: {
    virtuals: true,
    transform: (_doc: unknown, ret: Record<string, unknown>) => {
      delete ret._id;
      return ret;
    },
  },
};

export const num = (extra: Record<string, unknown> = {}) => ({
  type: Number,
  default: 0,
  min: 0,
  ...extra,
});

export const photoUrl = {
  type: String,
  trim: true,
  match: [
    /^(https?:\/\/\S+)?$/i,
    "A foto precisa ser um link começando com http:// ou https://.",
  ] as [RegExp, string],
};
