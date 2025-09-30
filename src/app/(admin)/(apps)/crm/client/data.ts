import user1 from '@/assets/images/users/user-1.jpg'
import user10 from '@/assets/images/users/user-10.jpg'
import user2 from '@/assets/images/users/user-2.jpg'
import user3 from '@/assets/images/users/user-3.jpg'
import user4 from '@/assets/images/users/user-4.jpg'
import user5 from '@/assets/images/users/user-5.jpg'
import user6 from '@/assets/images/users/user-6.jpg'
import user7 from '@/assets/images/users/user-7.jpg'
import user8 from '@/assets/images/users/user-8.jpg'
import user9 from '@/assets/images/users/user-9.jpg'

import flagBR from '@/assets/images/flags/br.svg'
import flagCA from '@/assets/images/flags/ca.svg'
import flagDE from '@/assets/images/flags/de.svg'
import flagEG from '@/assets/images/flags/eg.svg'
import flagFR from '@/assets/images/flags/fr.svg'
import flagUK from '@/assets/images/flags/gb.svg'
import flagIN from '@/assets/images/flags/in.svg'
import flagJP from '@/assets/images/flags/jp.svg'
import flagUS from '@/assets/images/flags/us.svg'


export type CustomerType = {
  id: string;
  numCin: string;
  nomPrenom: string;
  numTelephone: string;
  dateCreation: string; // format YYYY-MM-DD
  type: 'fallah' | 'kayyel';
};



export const customers: CustomerType[] = [
  {
    id: '1',
    numCin: '12345678',
    nomPrenom: 'Mohamed Ali',
    numTelephone: '+216 20 123 456',
    dateCreation: '2024-01-15',
    type: 'fallah',
  },
  {
    id: '2',
    numCin: '23456789',
    nomPrenom: 'Sara Ben Youssef',
    numTelephone: '+216 50 234 567',
    dateCreation: '2024-02-01',
    type: 'kayyel',
  },
  {
    id: '3',
    numCin: '34567890',
    nomPrenom: 'Ravi Deshmukh',
    numTelephone: '+91 98765 43210',
    dateCreation: '2024-03-10',
    type: 'fallah',
  },
  {
    id: '4',
    numCin: '45678901',
    nomPrenom: 'Laura Kim',
    numTelephone: '+82 10-1234-5678',
    dateCreation: '2023-12-20',
    type: 'kayyel',
  },
  {
    id: '5',
    numCin: '56789012',
    nomPrenom: 'Jean Dupont',
    numTelephone: '+33 6 12 34 56 78',
    dateCreation: '2024-04-05',
    type: 'fallah',
  },
  {
    id: '6',
    numCin: '67890123',
    nomPrenom: 'Amanda Rivera',
    numTelephone: '+1 (213) 555-0192',
    dateCreation: '2024-03-25',
    type: 'kayyel',
  },
  {
    id: '7',
    numCin: '78901234',
    nomPrenom: 'Carlos Mendes',
    numTelephone: '+55 11 91234-5678',
    dateCreation: '2024-02-18',
    type: 'fallah',
  },
  {
    id: '8',
    numCin: '89012345',
    nomPrenom: 'Lena Hoffmann',
    numTelephone: '+49 176 12345678',
    dateCreation: '2024-04-03',
    type: 'kayyel',
  },
  {
    id: '9',
    numCin: '90123456',
    nomPrenom: 'Akira Sato',
    numTelephone: '+81 90-1234-5678',
    dateCreation: '2024-02-12',
    type: 'fallah',
  },
  {
    id: '10',
    numCin: '11223344',
    nomPrenom: 'Sophie Dubois',
    numTelephone: '+33 7 89 01 23 45',
    dateCreation: '2024-02-09',
    type: 'kayyel',
  },
  {
    id: '11',
    numCin: '22334455',
    nomPrenom: 'Omar Farouk',
    numTelephone: '+20 100 123 4567',
    dateCreation: '2024-04-12',
    type: 'fallah',
  },
  {
    id: '12',
    numCin: '33445566',
    nomPrenom: 'John Smith',
    numTelephone: '+1 (416) 555-3210',
    dateCreation: '2024-02-05',
    type: 'kayyel',
  },
];

