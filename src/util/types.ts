export type First<T> = T extends (infer U)[] ? U : never;
