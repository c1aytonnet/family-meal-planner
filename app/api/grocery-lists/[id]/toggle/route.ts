import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { groceryListRepository } from "@/lib/storage/repositories";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { itemId, checked } = (await request.json()) as {
    itemId?: string;
    checked?: boolean;
  };

  const list = await groceryListRepository.get(id);
  if (!list || !itemId) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  list.items = list.items.map((item) =>
    item.id === itemId ? { ...item, checked: Boolean(checked) } : item,
  );
  list.updatedAt = new Date().toISOString();

  await groceryListRepository.save(list);
  revalidatePath("/grocery-lists");

  return NextResponse.json({ ok: true });
}
