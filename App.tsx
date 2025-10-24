
import React, { useState, useCallback, useMemo, ChangeEvent, DragEvent } from 'react';
import { AppMode, ImageFile, ResultImage } from './types';
import { downloadImage, downloadAllAsZip } from './utils/fileUtils';
import { generateVirtualTryOn, editImage, generateImage, placePosterOnWall } from './services/geminiService';

// --- Icon Components ---
const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// --- UI Components (defined outside App to prevent re-renders) ---

interface ImageUploaderProps {
  onFilesChange: (files: ImageFile[]) => void;
  label: string;
  multiple: boolean;
  limit?: number;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onFilesChange, label, multiple, limit }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<ImageFile[]>([]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    const newImageFiles: ImageFile[] = Array.from(files)
      .filter(file => file.type.startsWith('image/'))
      .map(file => ({
        file,
        preview: URL.createObjectURL(file),
        name: file.name
      }));

    if (newImageFiles.length === 0) return;

    let updatedFiles;
    if (multiple) {
      updatedFiles = [...uploadedFiles, ...newImageFiles];
      if (limit && updatedFiles.length > limit) {
        updatedFiles = updatedFiles.slice(updatedFiles.length - limit);
      }
    } else {
      updatedFiles = newImageFiles.slice(-1); // Only take the last one
    }

    setUploadedFiles(updatedFiles);
    onFilesChange(updatedFiles);
  }, [multiple, onFilesChange, uploadedFiles, limit]);

  const handleDrag = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };
  
  const removeFile = (fileName: string) => {
    const newFiles = uploadedFiles.filter(f => f.name !== fileName);
    setUploadedFiles(newFiles);
    onFilesChange(newFiles);
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
      <div 
        onDragEnter={handleDrag} 
        onDragLeave={handleDrag} 
        onDragOver={handleDrag} 
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg transition-colors duration-200 ${dragActive ? 'border-indigo-400 bg-gray-800' : 'border-gray-600 hover:border-gray-500 bg-gray-900'}`}
      >
        <input type="file" multiple={multiple} onChange={handleChange} accept="image/*" className="absolute w-full h-full opacity-0 cursor-pointer" />
        <UploadIcon className="w-10 h-10 text-gray-500 mb-2" />
        <p className="text-gray-400">Drag & drop or <span className="font-semibold text-indigo-400">browse</span></p>
        {limit && <p className="text-xs text-gray-500 mt-1">{`Max ${limit} files`}</p>}
      </div>
      {uploadedFiles.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {uploadedFiles.map((imageFile) => (
            <div key={imageFile.name} className="relative group">
              <img src={imageFile.preview} alt={imageFile.name} className="w-full h-24 object-cover rounded-md" />
              <button 
                onClick={() => removeFile(imageFile.name)}
                className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <XIcon className="w-4 h-4" />
              </button>
              <p className="text-xs text-gray-400 truncate mt-1">{imageFile.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface ResultGridProps {
  results: ResultImage[];
}

const ResultGrid: React.FC<ResultGridProps> = ({ results }) => (
  <div className="mt-8">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-2xl font-bold tracking-tight text-white">Results</h2>
      {results.length > 1 && (
        <button
          onClick={() => downloadAllAsZip(results)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          <DownloadIcon className="w-5 h-5" />
          Download All (.zip)
        </button>
      )}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {results.map((result, index) => (
        <div key={index} className="bg-gray-800 rounded-lg overflow-hidden group">
          <div className="relative">
            <img src={result.src} alt={result.name} className="w-full h-64 object-cover" />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center">
              <button
                onClick={() => downloadImage(result.src, result.name)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-md opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all duration-300"
              >
                <DownloadIcon className="w-5 h-5" />
                Download
              </button>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm font-medium text-white truncate">{result.name}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const Loader: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center text-center p-8">
    <svg className="animate-spin h-12 w-12 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <p className="mt-4 text-lg font-semibold text-white">{message}</p>
    <p className="mt-1 text-sm text-gray-400">This may take a few moments. Please don't close this page.</p>
  </div>
);

// --- Main App ---

export default function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.OneModelNOutfits);
  const [models, setModels] = useState<ImageFile[]>([]);
  const [outfits, setOutfits] = useState<ImageFile[]>([]);
  const [baseImage, setBaseImage] = useState<ImageFile[]>([]);
  const [poster, setPoster] = useState<ImageFile[]>([]);
  const [prompt, setPrompt] = useState('Create a photorealistic image of the model wearing the outfit. Match the lighting, shadows, and style for a seamless composition.');
  const [results, setResults] = useState<ResultImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const isBatchMode = mode === AppMode.OneModelNOutfits || mode === AppMode.NModelsOneOutfit || mode === AppMode.PosterPlacement;

  const isGenerateButtonDisabled = useMemo(() => {
    if (isLoading) return true;
    switch (mode) {
      case AppMode.OneModelNOutfits:
        return models.length === 0 || outfits.length === 0;
      case AppMode.NModelsOneOutfit:
        return models.length === 0 || outfits.length === 0;
      case AppMode.Editor:
        return baseImage.length === 0 || prompt.trim() === '';
      case AppMode.Generator:
        return prompt.trim() === '';
      case AppMode.PosterPlacement:
        return poster.length === 0 || prompt.trim() === '';
      default:
        return true;
    }
  }, [isLoading, mode, models, outfits, baseImage, poster, prompt]);

  const handleGenerate = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      if (mode === AppMode.OneModelNOutfits) {
        setLoadingMessage(`Generating ${outfits.length} images... (1 of ${outfits.length})`);
        const generatedResults: ResultImage[] = [];
        for (const [index, outfit] of outfits.entries()) {
          setLoadingMessage(`Generating ${outfits.length} images... (${index + 1} of ${outfits.length})`);
          const resultSrc = await generateVirtualTryOn(models[0], outfit, prompt);
          const resultName = `${models[0].name.split('.')[0]}_${outfit.name.split('.')[0]}.png`;
          generatedResults.push({ src: resultSrc, name: resultName });
        }
        setResults(generatedResults);
      } else if (mode === AppMode.NModelsOneOutfit) {
        setLoadingMessage(`Generating ${models.length} images... (1 of ${models.length})`);
        const generatedResults: ResultImage[] = [];
        for (const [index, model] of models.entries()) {
          setLoadingMessage(`Generating ${models.length} images... (${index + 1} of ${models.length})`);
          const resultSrc = await generateVirtualTryOn(model, outfits[0], prompt);
          const resultName = `${model.name.split('.')[0]}_${outfits[0].name.split('.')[0]}.png`;
          generatedResults.push({ src: resultSrc, name: resultName });
        }
        setResults(generatedResults);
      } else if (mode === AppMode.Editor) {
        setLoadingMessage('Editing your image...');
        const resultSrc = await editImage(baseImage[0], prompt);
        setResults([{ src: resultSrc, name: `edited_${baseImage[0].name}` }]);
      } else if (mode === AppMode.Generator) {
        setLoadingMessage('Generating your masterpiece...');
        const resultSrc = await generateImage(prompt);
        setResults([{ src: resultSrc, name: 'generated_image.png' }]);
      } else if (mode === AppMode.PosterPlacement) {
        setLoadingMessage(`Placing ${poster.length} posters... (1 of ${poster.length})`);
        const generatedResults: ResultImage[] = [];
         for (const [index, p] of poster.entries()) {
          setLoadingMessage(`Placing ${poster.length} posters... (${index + 1} of ${poster.length})`);
          const resultSrc = await placePosterOnWall(p, prompt);
          const resultName = `poster_in_room_${p.name}`;
          generatedResults.push({ src: resultSrc, name: resultName });
        }
        setResults(generatedResults);
      }
    } catch (error) {
      console.error("Generation failed:", error);
      alert("An error occurred during generation. Check the console for details.");
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };
  
  const handleModeChange = (newMode: AppMode) => {
    setMode(newMode);
    setResults([]);
    setModels([]);
    setOutfits([]);
    setBaseImage([]);
    setPoster([]);
    if (newMode === AppMode.Editor) {
        setPrompt('Add a retro filter to this image.');
    } else if (newMode === AppMode.Generator) {
        setPrompt('A vibrant, photorealistic image of a futuristic city at sunset.');
    } else if (newMode === AppMode.PosterPlacement) {
        setPrompt('Place this poster on a wall in a cozy bedroom, next to the bed. The poster should be frameless and blend naturally with the room\'s lighting and perspective.');
    } else {
        setPrompt('Create a photorealistic image of the model wearing the outfit. Match the lighting, shadows, and style for a seamless composition.');
    }
  }

  const promptLabel = useMemo(() => {
    switch (mode) {
      case AppMode.OneModelNOutfits:
      case AppMode.NModelsOneOutfit:
        return "Prompt / Instructions";
      case AppMode.Editor:
        return "Editing Instructions";
      case AppMode.PosterPlacement:
        return "Placement Instructions";
      case AppMode.Generator:
        return "Image Prompt";
      default:
        return "Prompt";
    }
  }, [mode]);

  const renderContent = () => (
    <div className="space-y-8">
      {mode === AppMode.OneModelNOutfits && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ImageUploader onFilesChange={setModels} label="Model/Person (1 image)" multiple={false} />
          <ImageUploader onFilesChange={setOutfits} label="Outfits (Multiple images)" multiple={true} />
        </div>
      )}
      {mode === AppMode.NModelsOneOutfit && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ImageUploader onFilesChange={setModels} label="Models/Persons (Multiple images)" multiple={true} />
          <ImageUploader onFilesChange={setOutfits} label="Outfit (1 image)" multiple={false} />
        </div>
      )}
      {mode === AppMode.Editor && (
        <ImageUploader onFilesChange={setBaseImage} label="Upload Image to Edit" multiple={false} />
      )}
       {mode === AppMode.PosterPlacement && (
        <ImageUploader onFilesChange={setPoster} label="Upload Poster Images" multiple={true} />
      )}
      <div>
        <label htmlFor="prompt" className="block text-sm font-medium text-gray-400 mb-2">
            {promptLabel}
        </label>
        <textarea
          id="prompt"
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 rounded-md p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="e.g., 'Make the outfit look natural on the model...'"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
            Virtual Try-On & AI Image Suite
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-400">
            Batch-process virtual try-ons, edit photos with text, or generate new images from scratch.
          </p>
        </header>

        <div className="mb-10">
          <div className="flex flex-wrap justify-center border-b border-gray-700">
            {Object.values(AppMode).map((m) => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className={`px-4 py-3 text-sm font-medium transition-colors duration-200 focus:outline-none ${mode === m ? 'border-b-2 border-indigo-400 text-indigo-400' : 'border-b-2 border-transparent text-gray-400 hover:text-white hover:bg-gray-800'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-6 sm:p-8 border border-gray-700 shadow-lg">
          {renderContent()}
        </div>

        <div className="mt-8 flex justify-center">
            <button
              onClick={handleGenerate}
              disabled={isGenerateButtonDisabled}
              className="px-12 py-4 text-lg font-bold text-white bg-indigo-600 rounded-lg shadow-lg hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:scale-100"
            >
              {isBatchMode ? "Create Batch" : "Generate"}
            </button>
        </div>

        <div className="mt-12">
          {isLoading && <Loader message={loadingMessage} />}
          {!isLoading && results.length > 0 && <ResultGrid results={results} />}
        </div>
      </main>
    </div>
  );
}
