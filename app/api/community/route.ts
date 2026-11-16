import { NextResponse } from "next/server";

import { apiRoute } from "@/lib/api/route";
import { communityActionSchema } from "@/lib/validation/generate";

/** Comunidade: todo aluno logado lê; cada um cria/apaga só o seu (RLS). O nome do autor vem do perfil. */
export const POST = apiRoute(communityActionSchema, async (input, { supabase, user }) => {
  switch (input.action) {
    case "post": {
      const { data, error } = await supabase
        .from("community_posts")
        .insert({ user_id: user.id, author_name: "", category: input.category, title: input.title, body: input.body })
        .select("id")
        .single();
      if (error) throw error;
      return NextResponse.json(data, { status: 201 });
    }
    case "comment": {
      const { error } = await supabase.from("community_comments").insert({ user_id: user.id, author_name: "", post_id: input.post_id, body: input.body });
      if (error) throw error;
      return NextResponse.json({ ok: true }, { status: 201 });
    }
    case "like": {
      const { error } = input.like
        ? await supabase.from("community_likes").upsert({ post_id: input.post_id, user_id: user.id }, { onConflict: "post_id,user_id", ignoreDuplicates: true })
        : await supabase.from("community_likes").delete().eq("post_id", input.post_id).eq("user_id", user.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }
    case "delete_post": {
      const { error } = await supabase.from("community_posts").delete().eq("id", input.id).eq("user_id", user.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }
    case "delete_comment": {
      const { error } = await supabase.from("community_comments").delete().eq("id", input.id).eq("user_id", user.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }
  }
});
