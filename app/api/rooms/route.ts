import { NextResponse } from "next/server";

import { apiRoute } from "@/lib/api/route";
import { createRoom, createRoomQuiz, importMaterial, joinRoom, shareMaterial, submitRoomQuiz } from "@/lib/rooms/service";
import { roomActionSchema } from "@/lib/validation/generate";

export const maxDuration = 120;

/** D14 — salas da turma: criar, entrar pelo código, compartilhar/importar material e simulado da turma. */
export const POST = apiRoute(roomActionSchema, async (input, { supabase, user }) => {
  switch (input.action) {
    case "create": {
      const room = await createRoom(supabase, user.id, { name: input.name, subjectId: input.subject_id });
      return NextResponse.json({ code: room.invite_code }, { status: 201 });
    }
    case "join":
      return NextResponse.json({ room_id: await joinRoom(supabase, input.code) });
    case "share":
      await shareMaterial(supabase, user.id, input.room_id, input.material_id);
      return NextResponse.json({ ok: true });
    case "import":
      return NextResponse.json({ material_id: await importMaterial(supabase, user.id, { roomMaterialId: input.room_material_id, subjectId: input.subject_id }) });
    case "quiz":
      return NextResponse.json(
        { room_quiz_id: await createRoomQuiz(supabase, user.id, { roomId: input.room_id, subjectId: input.subject_id, count: input.count, style: input.style }) },
        { status: 201 },
      );
    case "submit":
      return NextResponse.json(await submitRoomQuiz(supabase, user.id, { roomQuizId: input.room_quiz_id, answers: input.answers, timeMs: input.time_ms }));
  }
}, { ai: true });
