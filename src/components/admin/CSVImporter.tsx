
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import * as XLSX from 'xlsx';

interface ImportResult {
  success: number;
  errors: string[];
  total: number;
  sheetResults: { [sheetName: string]: { success: number; total: number; errors: string[] } };
}

export const CSVImporter = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const { toast } = useToast();

  // Subject-topic mapping based on your structure
  const subjectTopics = {
    'Biology': [
      'Acellular Life', 'Bioenergetics', 'Biological Molecules', 'Evolution',
      'Reproduction', 'Enzymes', 'Coordination and Control', 'Variation and genetics',
      'Life processes in animals and plantS', 'Cell structure and Function',
      'Support and movement', 'Inheritance'
    ],
    'Physics': [
      'Force and Motion', 'Electronics', 'Rotational and circular motion',
      'Electrostatistics', 'Electromagnetism', 'Electromagnetic Induction',
      'Waves', 'Nuclear Physics', 'Work and energy'
    ],
    'Chemistry': [
      'Fundamental Concepts', 'Carboxylic Acids', 'Solids', 'Chemical Bonding',
      'Chemical Equilibrium', 'Principles of organic chemistry', 'Alcohols and Phenols',
      'S and p block elements', 'Aldehydes and Ketones', 'Thermochemistry',
      'Liquids', 'Gases', 'Reaction Kinetics'
    ],
    'English': [
      'Tenses & Sentence Structure', 'Vocabulary (max 25-30 words)', 'Punctuation & Style',
      'spelling', 'Adverb', 'Adjective', 'Verb'
    ],
       'Logical Reasoning': [
     'Letter and Symbol Series', 'Logical Deductions', 'Critical Thinking', 
     'Cause and Effect', 'Logical Problems', 'Course of Action'
   ]
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('Selected file:', file?.name, file?.type);
    
    if (file && (file.type === 'text/csv' || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx') || file.name.endsWith('.csv'))) {
      setSelectedFile(file);
      setImportResult(null);
      parseFileForPreview(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a CSV or Excel (.xlsx) file",
        variant: "destructive",
      });
    }
  };

  const parseFileForPreview = async (file: File) => {
    try {
      console.log('Starting file preview parsing...');
      
      let sheets: { [key: string]: any[][] } = {};
      
      if (file.name.endsWith('.xlsx') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        // Parse Excel file
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        console.log('Excel sheets found:', workbook.SheetNames);
        
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          sheets[sheetName] = jsonData as any[][];
        });
      } else {
        // Parse CSV file (single sheet)
        const csvText = await file.text();
        const lines = csvText.split('\n').filter(line => line.trim());
        
        // For CSV, detect sheet boundaries by looking for topic headers
        let currentSheet = '';
        let currentSheetLines: string[] = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const cells = parseCSVLine(line);
          const firstCell = cells[0] || '';
          
          // Check if this is a sheet header (topic name)
          if (firstCell && 
              !firstCell.match(/^\d+$/) && 
              firstCell !== 'Question' && 
              firstCell !== '' &&
              firstCell !== 'Sr.' &&
              !firstCell.toLowerCase().includes('option')) {
            
            // Save previous sheet
            if (currentSheet && currentSheetLines.length > 0) {
              const sheetData = currentSheetLines.map(line => parseCSVLine(line));
              sheets[currentSheet] = sheetData;
            }
            
            // Start new sheet
            currentSheet = firstCell;
            currentSheetLines = [];
            
            // Skip header row if present
            if (i + 1 < lines.length) {
              const nextLine = lines[i + 1];
              const nextCells = parseCSVLine(nextLine);
              if (nextCells[1] && nextCells[1].toLowerCase().includes('question')) {
                i++; // Skip header row
              }
            }
          } else if (currentSheet) {
            currentSheetLines.push(line);
          }
        }
        
        // Add the last sheet
        if (currentSheet && currentSheetLines.length > 0) {
          const sheetData = currentSheetLines.map(line => parseCSVLine(line));
          sheets[currentSheet] = sheetData;
        }
      }
      
      console.log('All sheets found:', Object.keys(sheets));
      
      // Create preview data
      const preview = Object.keys(sheets).slice(0, 5).map(sheetName => {
        const sheetData = sheets[sheetName];
        
        // Count questions starting from row 3 (index 2)
        let questionCount = 0;
        for (let i = 2; i < sheetData.length; i++) {
          const row = sheetData[i];
          const serialNum = row[0] ? String(row[0]).trim() : '';
          const question = row[1] ? String(row[1]).trim() : '';
          
          if (serialNum && serialNum.match(/^\d+$/) && question) {
            questionCount++;
          }
        }
        
        console.log(`Sheet "${sheetName}": ${questionCount} questions found`);
        
        return {
          sheet: sheetName,
          questionCount: questionCount
        };
      });
      
      console.log('Preview data:', preview);
      setPreviewData(preview);
      
    } catch (error) {
      console.error('Preview error:', error);
      toast({
        title: "Preview Error",
        description: "Could not preview the file",
        variant: "destructive",
      });
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  const parseFile = async (file: File): Promise<{ [key: string]: any[] }> => {
    console.log('Starting full file parsing...');
    
    let sheets: { [key: string]: any[][] } = {};
    
    if (file.name.endsWith('.xlsx') || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      // Parse Excel file
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        sheets[sheetName] = jsonData as any[][];
      });
    } else {
      // Parse CSV file (same logic as preview)
      const csvText = await file.text();
      const lines = csvText.split('\n').filter(line => line.trim());
      
      let currentSheet = '';
      let currentSheetLines: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const cells = parseCSVLine(line);
        const firstCell = cells[0] || '';
        
        if (firstCell && 
            !firstCell.match(/^\d+$/) && 
            firstCell !== 'Question' && 
            firstCell !== '' &&
            firstCell !== 'Sr.' &&
            !firstCell.toLowerCase().includes('option')) {
          
          if (currentSheet && currentSheetLines.length > 0) {
            const sheetData = currentSheetLines.map(line => parseCSVLine(line));
            sheets[currentSheet] = sheetData;
          }
          
          currentSheet = firstCell;
          currentSheetLines = [];
          
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            const nextCells = parseCSVLine(nextLine);
            if (nextCells[1] && nextCells[1].toLowerCase().includes('question')) {
              i++;
            }
          }
        } else if (currentSheet) {
          currentSheetLines.push(line);
        }
      }
      
      if (currentSheet && currentSheetLines.length > 0) {
        const sheetData = currentSheetLines.map(line => parseCSVLine(line));
        sheets[currentSheet] = sheetData;
      }
    }
    
    // Convert sheets to questions format
    const result: { [key: string]: any[] } = {};
    
    Object.entries(sheets).forEach(([sheetName, sheetData]) => {
      const questions = [];
      
      // Start from row 3 (index 2)
      for (let i = 2; i < sheetData.length; i++) {
        const row = sheetData[i];
        
        const serialNum = row[0] ? String(row[0]).trim() : '';
        const question = row[1] ? String(row[1]).trim() : '';
        const optionA = row[2] ? String(row[2]).trim() : '';
        const optionB = row[3] ? String(row[3]).trim() : '';
        const optionC = row[4] ? String(row[4]).trim() : '';
        const optionD = row[5] ? String(row[5]).trim() : '';
        const answer = row[6] ? String(row[6]).trim() : '';
        const explanation = row[7] ? String(row[7]).trim() : '';
        
        // Only add if we have a proper question
        if (serialNum && serialNum.match(/^\d+$/) && question && optionA && optionB) {
          questions.push({
            serial: serialNum,
            question: question,
            optionA: optionA,
            optionB: optionB,
            optionC: optionC,
            optionD: optionD,
            answer: answer,
            explanation: explanation
          });
        }
      }
      
      console.log(`Parsed sheet "${sheetName}": ${questions.length} questions`);
      result[sheetName] = questions;
    });
    
    return result;
  };

  const importQuestions = async () => {
    if (!selectedFile || !selectedSubject) {
      toast({
        title: "Missing Information",
        description: "Please select a file and subject",
        variant: "destructive",
      });
      return;
    }

    console.log(`Starting import for subject: ${selectedSubject}`);
    setIsImporting(true);
    const result: ImportResult = { 
      success: 0, 
      errors: [], 
      total: 0, 
      sheetResults: {} 
    };

    try {
      // Parse file
      const sheets = await parseFile(selectedFile);
      
      console.log('Parsed sheets:', Object.keys(sheets));
      
      for (const [sheetName, questions] of Object.entries(sheets)) {
        console.log(`Processing sheet: ${sheetName} with ${questions.length} questions`);
        
        const sheetResult = { success: 0, total: questions.length, errors: [] };
        result.sheetResults[sheetName] = sheetResult;
        result.total += questions.length;
        
        // Find matching chapter
        const { data: chapter, error: chapterError } = await supabase
          .from('chapters')
          .select('id')
          .eq('name', sheetName)
          .single();

        console.log(`Chapter lookup for "${sheetName}":`, chapter, chapterError);

        if (chapterError || !chapter) {
          const error = `Topic "${sheetName}" not found in database`;
          console.error(error);
          result.errors.push(error);
          sheetResult.errors.push(error);
          continue;
        }

        // Import questions for this sheet
        for (const q of questions) {
          try {
            console.log(`Importing question: ${q.question.substring(0, 50)}...`);
            
            const { error } = await supabase
              .from('mcqs')
              .insert({
                chapter_id: chapter.id,
                question: q.question,
                options: [q.optionA, q.optionB, q.optionC, q.optionD],
                correct_answer: q.answer,
                explanation: q.explanation,
                subject: selectedSubject,
                difficulty: 'medium'
              });

            if (error) {
              console.error('Insert error:', error);
              throw error;
            }
            
            result.success++;
            sheetResult.success++;
            console.log(`Successfully imported question ${q.serial}`);
          } catch (error: any) {
            const errorMsg = `Question "${q.question.substring(0, 50)}...": ${error.message}`;
            console.error('Question import error:', errorMsg);
            result.errors.push(errorMsg);
            sheetResult.errors.push(errorMsg);
          }
        }
      }

      console.log('Import completed:', result);
      setImportResult(result);
      toast({
        title: "Import Complete",
        description: `Successfully imported ${result.success} out of ${result.total} questions`,
      });

    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-6 h-6" />
            <span>Excel/CSV Question Importer</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Selection */}
          <div className="space-y-2">
            <Label htmlFor="file">Select Excel (.xlsx) or CSV File</Label>
            <Input
              id="file"
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileSelect}
            />
            {selectedFile && (
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <FileText className="w-4 h-4" />
                <span>{selectedFile.name}</span>
              </div>
            )}
          </div>

          {/* Subject Selection */}
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Select Subject" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(subjectTopics).map(subject => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          {previewData.length > 0 && (
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-lg">File Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sheet/Topic Name</TableHead>
                      <TableHead>Questions Found</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((sheet, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{sheet.sheet}</TableCell>
                        <TableCell>{sheet.questionCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {previewData.length > 3 && (
                  <p className="text-sm text-gray-600 mt-2">
                    ... and more sheets in the file
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Import Button */}
          <Button
            onClick={importQuestions}
            disabled={!selectedFile || !selectedSubject || isImporting}
            className="w-full"
          >
            {isImporting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Importing...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Upload className="w-4 h-4" />
                <span>Import All Sheets</span>
              </div>
            )}
          </Button>

          {/* Import Results */}
          {importResult && (
            <Card className="mt-4">
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-600 font-medium">
                      Overall: {importResult.success}/{importResult.total} questions imported
                    </span>
                  </div>
                  
                  {/* Sheet-by-sheet results */}
                  {Object.keys(importResult.sheetResults).length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">Sheet Results:</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Sheet Name</TableHead>
                            <TableHead>Success</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(importResult.sheetResults).map(([sheetName, result]) => (
                            <TableRow key={sheetName}>
                              <TableCell className="font-medium">{sheetName}</TableCell>
                              <TableCell>{result.success}</TableCell>
                              <TableCell>{result.total}</TableCell>
                              <TableCell>
                                {result.success === result.total ? (
                                  <span className="text-green-600">✓ Complete</span>
                                ) : (
                                  <span className="text-yellow-600">⚠ Partial</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  
                  {importResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <span className="text-red-600 font-medium">Errors:</span>
                      </div>
                      <div className="max-h-32 overflow-y-auto text-sm text-red-600">
                        {importResult.errors.slice(0, 10).map((error, index) => (
                          <div key={index}>• {error}</div>
                        ))}
                        {importResult.errors.length > 10 && (
                          <div>... and {importResult.errors.length - 10} more errors</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <h4 className="font-semibold text-blue-900 mb-2">File Format Instructions:</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Excel (.xlsx):</strong> Each sheet should represent a topic/chapter</p>
                <p><strong>CSV:</strong> Use topic names as section headers to separate different topics</p>
                <p>• Questions should start from row 3 in each sheet</p>
                <p>• Column A: Serial number, Column B: Question text</p>
                <p>• Columns C, D, E, F: Option A, B, C, D respectively</p>
                <p>• Column G: Correct answer (A, B, C, or D)</p>
                <p>• Column H: Explanation (optional)</p>
                <p>• Sheet/topic names must match the topics in your selected subject</p>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};