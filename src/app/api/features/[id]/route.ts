import { NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non connecté." }, { status: 401 });
    }
    if (!isAdmin(user.email)) {
      return NextResponse.json({ error: "Accès interdit. Réservé aux administrateurs." }, { status: 403 });
    }

    const { id } = await params;
    const { status } = await request.json();

    const validStatuses = ["PENDING", "PLANNED", "COMPLETED", "REJECTED"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Statut invalide ou absent." }, { status: 400 });
    }

    const updatedFeature = await prisma.featureRequest.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updatedFeature);
  } catch (e: any) {
    console.error("Update feature request error:", e);
    return NextResponse.json({ error: "Une erreur est survenue lors de la mise à jour de la suggestion." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non connecté." }, { status: 401 });
    }
    if (!isAdmin(user.email)) {
      return NextResponse.json({ error: "Accès interdit. Réservé aux administrateurs." }, { status: 403 });
    }

    const { id } = await params;

    await prisma.featureRequest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "La suggestion a été supprimée avec succès." });
  } catch (e: any) {
    console.error("Delete feature request error:", e);
    return NextResponse.json({ error: "Une erreur est survenue lors de la suppression de la suggestion." }, { status: 500 });
  }
}
