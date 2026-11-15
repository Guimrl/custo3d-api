import mongoose from "mongoose";
import { schemaOptions } from "./utils";

export interface UserType {
  username: string;
  name: string;
  password?: string;
  passwordHash?: string;
}

const userSchema = new mongoose.Schema<UserType>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: { type: String, required: true, trim: true },
    password: { type: String },
    passwordHash: { type: String },
  },
  {
    ...schemaOptions,
    toJSON: {
      ...schemaOptions.toJSON,
      transform: (_doc: unknown, ret: Record<string, unknown>) => {
        delete ret._id;
        delete ret.password;
        delete ret.passwordHash;
        return ret;
      },
    },
  },
);

const users = mongoose.model("users", userSchema);

export default users;
