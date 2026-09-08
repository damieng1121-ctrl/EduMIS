import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AuthError } from "@/lib/session";

/** Wrap a route handler body so AuthError/ZodError/etc become clean JSON error responses. */
export function withApiErrors<T>(fn: () => Promise<T>) {
  return fn().then(
    (data) => NextResponse.json(data),
    (err) => {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json({ error: "Invalid request", issues: err.issues }, { status: 400 });
      }
      console.error(err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    },
  );
}

/**
 * P2003 is Prisma's code for "foreign key constraint failed" — thrown when
 * deleting a row that other rows still reference (e.g. a teacher who has
 * recorded attendance). Callers use this to turn that into a friendly
 * "deactivate instead" message rather than a raw 500.
 */
export function isForeignKeyConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003";
}
