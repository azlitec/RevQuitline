import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import jsPDF from 'jspdf';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a patient
    if (session.user.isProvider || session.user.isAdmin || session.user.isClerk) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const recordId = params.id;

    // Fetch the specific health record
    const healthRecord = await prisma.healthRecord.findFirst({
      where: {
        id: recordId,
        patientId: session.user.id as string
      },
      include: {
        provider: {
          select: {
            firstName: true,
            lastName: true,
            specialty: true,
            licenseNumber: true
          }
        },
        patient: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            dateOfBirth: true
          }
        }
      }
    });

    if (!healthRecord) {
      return NextResponse.json({ error: 'Health record not found' }, { status: 404 });
    }

    // Create PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let yPosition = 20;

    // Helper function to add text with word wrapping
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text || 'N/A', maxWidth);
      doc.text(lines, x, y);
      return y + (lines.length * 5);
    };

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Health Record', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Record Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Record Information', 20, yPosition);
    yPosition += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Title: ${healthRecord.title}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Type: ${healthRecord.type}`, 20, yPosition);
    yPosition += 8;
    doc.text(`Date: ${new Date(healthRecord.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}`, 20, yPosition);
    yPosition += 15;

    // Provider Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Provider Information', 20, yPosition);
    yPosition += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Name: ${healthRecord.provider.firstName} ${healthRecord.provider.lastName}`, 20, yPosition);
    yPosition += 8;
    if (healthRecord.provider.specialty) {
      doc.text(`Specialty: ${healthRecord.provider.specialty}`, 20, yPosition);
      yPosition += 8;
    }
    if (healthRecord.provider.licenseNumber) {
      doc.text(`License: ${healthRecord.provider.licenseNumber}`, 20, yPosition);
      yPosition += 8;
    }
    yPosition += 10;

    // Patient Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Patient Information', 20, yPosition);
    yPosition += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Name: ${healthRecord.patient.firstName} ${healthRecord.patient.lastName}`, 20, yPosition);
    yPosition += 8;
    if (healthRecord.patient.dateOfBirth) {
      doc.text(`Date of Birth: ${new Date(healthRecord.patient.dateOfBirth).toLocaleDateString()}`, 20, yPosition);
      yPosition += 8;
    }
    if (healthRecord.patient.email) {
      doc.text(`Email: ${healthRecord.patient.email}`, 20, yPosition);
      yPosition += 8;
    }
    if (healthRecord.patient.phone) {
      doc.text(`Phone: ${healthRecord.patient.phone}`, 20, yPosition);
      yPosition += 8;
    }
    yPosition += 15;

    // Description
    if (healthRecord.description) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Description', 20, yPosition);
      yPosition += 10;

      yPosition = addWrappedText(healthRecord.description, 20, yPosition, pageWidth - 40);
      yPosition += 10;
    }

    // Vital Signs
    if (healthRecord.vitalSigns) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Vital Signs', 20, yPosition);
      yPosition += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const vitals = typeof healthRecord.vitalSigns === 'object' ? healthRecord.vitalSigns : JSON.parse(healthRecord.vitalSigns as string);

      if (vitals.bloodPressure) {
        doc.text(`Blood Pressure: ${vitals.bloodPressure}`, 20, yPosition);
        yPosition += 8;
      }
      if (vitals.heartRate) {
        doc.text(`Heart Rate: ${vitals.heartRate} bpm`, 20, yPosition);
        yPosition += 8;
      }
      if (vitals.temperature) {
        doc.text(`Temperature: ${vitals.temperature}°F`, 20, yPosition);
        yPosition += 8;
      }
      if (vitals.oxygenSaturation) {
        doc.text(`Oxygen Saturation: ${vitals.oxygenSaturation}%`, 20, yPosition);
        yPosition += 8;
      }
      if (vitals.respiratoryRate) {
        doc.text(`Respiratory Rate: ${vitals.respiratoryRate} breaths/min`, 20, yPosition);
        yPosition += 8;
      }
      yPosition += 10;
    }

    // Diagnosis
    if (healthRecord.diagnosis) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Diagnosis', 20, yPosition);
      yPosition += 10;

      yPosition = addWrappedText(healthRecord.diagnosis, 20, yPosition, pageWidth - 40);
      yPosition += 10;
    }

    // Treatment
    if (healthRecord.treatment) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Treatment', 20, yPosition);
      yPosition += 10;

      yPosition = addWrappedText(healthRecord.treatment, 20, yPosition, pageWidth - 40);
      yPosition += 10;
    }

    // Medications
    if (healthRecord.medications) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Medications', 20, yPosition);
      yPosition += 10;

      yPosition = addWrappedText(healthRecord.medications, 20, yPosition, pageWidth - 40);
      yPosition += 10;
    }

    // Notes
    if (healthRecord.notes) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Notes', 20, yPosition);
      yPosition += 10;

      yPosition = addWrappedText(healthRecord.notes, 20, yPosition, pageWidth - 40);
      yPosition += 10;
    }

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 20, pageHeight - 20);
    doc.text('RevQuitline - Confidential Medical Record', pageWidth - 20, pageHeight - 20, { align: 'right' });

    // Convert to buffer and return
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="health-record-${healthRecord.id}.pdf"`);

    return new Response(pdfBuffer, { headers });

  } catch (error) {
    console.error('Health record download API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}