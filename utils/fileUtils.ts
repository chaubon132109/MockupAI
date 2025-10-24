import { ResultImage } from '../types';

// Declare JSZip for TypeScript since it's loaded from a CDN.
declare var JSZip: any;

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // remove "data:mime/type;base64," prefix
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const downloadImage = (src: string, name: string): void => {
  const link = document.createElement('a');
  link.href = src;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadAllAsZip = async (images: ResultImage[]): Promise<void> => {
  if (images.length === 0) return;

  const zip = new JSZip();
  
  await Promise.all(images.map(async (image) => {
    try {
      const response = await fetch(image.src);
      const blob = await response.blob();
      zip.file(image.name, blob);
    } catch (error) {
      console.error(`Failed to fetch image ${image.name}:`, error);
    }
  }));

  zip.generateAsync({ type: 'blob' }).then((content: Blob) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = 'virtual-try-on-results.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
};