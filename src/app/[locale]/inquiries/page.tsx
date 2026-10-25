import { notFound } from 'next/navigation';

// Inquiry screens have been retired; preserve existing private database records.
export default function RetiredInquiries() {
  notFound();
}
