import { PrismaClient } from '@prisma/client';

export interface RegisterStandalonePersonDTO {
  firstName: string;
  lastName: string;
  documentId: string;
  personType: 'RECIPROCITY' | 'EXTERNAL';
}

export class RegisterStandalonePersonUseCase {
  constructor(private prisma: PrismaClient) {}

  async execute(data: RegisterStandalonePersonDTO) {
    if (!data.firstName || !data.lastName || !data.personType) {
      throw new Error('Faltan campos obligatorios');
    }

    if (data.personType !== 'RECIPROCITY' && data.personType !== 'EXTERNAL') {
      throw new Error('Tipo de persona inválido');
    }

    const existingPerson = data.documentId 
      ? await this.prisma.person.findUnique({ where: { documentId: data.documentId } })
      : null;

    if (existingPerson) {
      return existingPerson;
    }

    // Generate a placeholder documentId if none is provided
    const docId = data.documentId && data.documentId.trim() !== '' 
      ? data.documentId 
      : `TMP-${Date.now()}`;

    const newPerson = await this.prisma.person.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        documentId: docId,
        personType: data.personType,
        status: 'ACTIVO'
      }
    });

    return newPerson;
  }
}
