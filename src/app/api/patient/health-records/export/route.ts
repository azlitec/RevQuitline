import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db';
import jsPDF from 'jspdf';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a patient
    if (session.user.isProvider || session.user.isAdmin || session.user.isClerk) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch all health records for the patient
    const healthRecords = await prisma.healthRecord.findMany({
      where: {
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
      },
      orderBy: {
        date: 'desc'
      }
    });

    if (healthRecords.length === 0) {
      return NextResponse.json({ error: 'No health records found' }, { status: 404 });
    }

    // Create PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Helper function to add text with word wrapping
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text || 'N/A', maxWidth);
      doc.text(lines, x, y);
      return y + (lines.length * 5);
    };

    // Helper function to check if we need a new page
    const checkNewPage = (yPosition: number) => {
      if (yPosition > pageHeight - 50) {
        doc.addPage();
        return 20;
      }
      return yPosition;
    };

    let yPosition = 20;

    // Cover page
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Medical Records Summary', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(`${healthRecords[0].patient.firstName} ${healthRecords[0].patient.lastName}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    doc.setFontSize(10);
    doc.text(`Total Records: ${healthRecords.length}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Patient Information', 20, yPosition);
    yPosition += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Name: ${healthRecords[0].patient.firstName} ${healthRecords[0].patient.lastName}`, 20, yPosition);
    yPosition += 8;
    if (healthRecords[0].patient.dateOfBirth) {
      doc.text(`Date of Birth: ${new Date(healthRecords[0].patient.dateOfBirth).toLocaleDateString()}`, 20, yPosition);
      yPosition += 8;
    }
    if (healthRecords[0].patient.email) {
      doc.text(`Email: ${healthRecords[0].patient.email}`, 20, yPosition);
      yPosition += 8;
    }
    if (healthRecords[0].patient.phone) {
      doc.text(`Phone: ${healthRecords[0].patient.phone}`, 20, yPosition);
      yPosition += 8;
    }

    // Table of Contents
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Table of Contents', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    healthRecords.forEach((record, index) => {
      const recordTitle = record.title.length > 50 ? record.title.substring(0, 50) + '...' : record.title;
      doc.text(`${index + 1}. ${recordTitle}`, 20, yPosition);
      doc.text(`Page ${index + 3}`, pageWidth - 40, yPosition, { align: 'right' });
      yPosition += 8;

      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = 20;
      }
    });

    // Individual records
    healthRecords.forEach((record, index) => {
      doc.addPage();
      yPosition = 20;

      // Record header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(record.title, 20, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Record ${index + 1} of ${healthRecords.length}`, pageWidth - 20, yPosition, { align: 'right' });
      yPosition += 15;

      // Record Info
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Record Information', 20, yPosition);
      yPosition += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Type: ${record.type}`, 20, yPosition);
      yPosition += 8;
      doc.text(`Date: ${new Date(record.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`, 20, yPosition);
      yPosition += 15;

      // Provider Info
      yPosition = checkNewPage(yPosition);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Provider Information', 20, yPosition);
      yPosition += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Name: ${record.provider.firstName} ${record.provider.lastName}`, 20, yPosition);
      yPosition += 8;
      if (record.provider.specialty) {
        doc.text(`Specialty: ${record.provider.specialty}`, 20, yPosition);
        yPosition += 8;
      }
      if (record.provider.licenseNumber) {
        doc.text(`License: ${record.provider.licenseNumber}`, 20, yPosition);
        yPosition += 8;
      }
      yPosition += 10;

      // Description
      if (record.description) {
        yPosition = checkNewPage(yPosition);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Description', 20, yPosition);
        yPosition += 10;

        yPosition = addWrappedText(record.description, 20, yPosition, pageWidth - 40);
        yPosition += 10;
      }

      // Vital Signs
      if (record.vitalSigns) {
        yPosition = checkNewPage(yPosition);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Vital Signs', 20, yPosition);
        yPosition += 10;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const vitals = typeof record.vitalSigns === 'object' ? record.vitalSigns : JSON.parse(record.vitalSigns as string);

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
      if (record.diagnosis) {
        yPosition = checkNewPage(yPosition);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Diagnosis', 20, yPosition);
        yPosition += 10;

        yPosition = addWrappedText(record.diagnosis, 20, yPosition, pageWidth - 40);
        yPosition += 10;
      }

      // Treatment
      if (record.treatment) {
        yPosition = checkNewPage(yPosition);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Treatment', 20, yPosition);
        yPosition += 10;

        yPosition = addWrappedText(record.treatment, 20, yPosition, pageWidth - 40);
        yPosition += 10;
      }

      // Medications
      if (record.medications) {
        yPosition = checkNewPage(yPosition);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Medications', 20, yPosition);
        yPosition += 10;

        yPosition = addWrappedText(record.medications, 20, yPosition, pageWidth - 40);
        yPosition += 10;
      }

      // Notes
      if (record.notes) {
        yPosition = checkNewPage(yPosition);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Notes', 20, yPosition);
        yPosition += 10;

        yPosition = addWrappedText(record.notes, 20, yPosition, pageWidth - 40);
        yPosition += 10;
      }
    });

    // Convert to buffer and return
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="medical-records-${healthRecords[0].patient.firstName}-${healthRecords[0].patient.lastName}-${new Date().toISOString().split('T')[0]}.pdf"`);

    return new Response(pdfBuffer, { headers });

  } catch (error) {
    console.error('Health records export API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}