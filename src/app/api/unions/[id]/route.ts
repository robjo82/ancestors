import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

// PUT /api/unions/[id] - Modifie une union
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const {
      type,
      weddingDate,
      weddingPlace,
      divorceDate,
      isDivorced,
      notes,
    } = body;
    
    const updatedUnion = await prisma.union.update({
      where: { id },
      data: {
        type,
        weddingDate: weddingDate !== undefined ? weddingDate : undefined,
        weddingPlace: weddingPlace !== undefined ? weddingPlace : undefined,
        divorceDate: divorceDate !== undefined ? divorceDate : undefined,
        isDivorced: isDivorced !== undefined ? !!isDivorced : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    });
    
    return NextResponse.json(updatedUnion);
  } catch (error: any) {
    console.error("Erreur lors de la modification de l'union:", error);
    return NextResponse.json(
      { error: "Impossible de modifier l'union." },
      { status: 500 }
    );
  }
}

// DELETE /api/unions/[id] - Supprime une union
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await prisma.union.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erreur lors de la suppression de l'union:", error);
    return NextResponse.json(
      { error: "Impossible de supprimer l'union." },
      { status: 500 }
    );
  }
}
