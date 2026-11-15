import lodash from "lodash";
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
      transform: (_document: unknown, json: Record<string, unknown>) =>
        lodash.omit(json, ["_id", "password", "passwordHash"]),
    },
  },
);

const users = mongoose.model("users", userSchema);

export default users;
