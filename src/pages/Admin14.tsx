import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLockout from "@/components/admin/AdminLockout";
import AdminHeader from "@/components/admin/AdminHeader";
import { toast } from "sonner";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// --- Type Definitions ---
type Subject = {
    id: string;
    name: string;
    practical_components?: any;
};

type ComponentMeta = {
    icon?: string;
    name: string;
    slug: string;
};

type FormData = {
    practical_subject_id: string;
    component_slug: string;
    title: string;
    content_html: string;
};

// --- Component Start ---

export default function Admin14() {
    const [user, setUser] = useState<any | null>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
    const [components, setComponents] = useState<ComponentMeta[]>([]);
    const [selectedComponentSlug, setSelectedComponentSlug] = useState<string>("");
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState<FormData>({
        practical_subject_id: "",
        component_slug: "",
        title: "",
        content_html: "",
    });

    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    // const [fetchingExisting, setFetchingExisting] = useState(false); // Unused state removed

    // --- Effects ---

    // 1. Fetch User
    useEffect(() => {
        const run = async () => {
            const { data, error } = await supabase.auth.getUser();
            if (error) console.error(error);
            setUser(data?.user || null);
        };
        run();
    }, []);

    // 2. Fetch Subjects
    useEffect(() => {
        const run = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("practical_subjects")
                .select("id, name, practical_components");
            if (error) {
                console.error(error);
                toast.error("Failed to fetch subjects");
            } else {
                setSubjects((data || []) as Subject[]);
            }
            setLoading(false);
        };
        run();
    }, []);

    // 3. Update Components and Form on Subject Change
    useEffect(() => {
        // Reset component and content fields when subject changes
        setSelectedComponentSlug("");
        setFormData((prev) => ({
            ...prev,
            practical_subject_id: selectedSubjectId,
            component_slug: "",
            title: "",
            content_html: "",
        }));

        if (!selectedSubjectId) {
            setComponents([]);
            return;
        }

        const s = subjects.find((x) => x.id === selectedSubjectId);
        if (!s) {
            setComponents([]);
            return;
        }

        let parsed: ComponentMeta[] = [];
        try {
            if (!s.practical_components) parsed = [];
            else if (Array.isArray(s.practical_components))
                parsed = s.practical_components;
            else parsed = JSON.parse(s.practical_components);
        } catch (err) {
            console.error("Failed to parse practical_components for subject:", err);
            toast.error("Invalid practical_components JSON on selected subject");
            parsed = [];
        }

        setComponents(parsed);
    }, [selectedSubjectId, subjects]);

    // 4. Update Form on Component Slug Change
    useEffect(() => {
        setFormData((prev) => ({
            ...prev,
            component_slug: selectedComponentSlug,
        }));
        // Reset title and content to allow for new entry, but keep subject/component selected
        setFormData((prev) => ({ ...prev, title: "", content_html: "" }));
    }, [selectedComponentSlug]);

    // --- Handlers ---

    // Generic form change handler for Input/Textarea
    const handleFormChange = (key: keyof FormData, value: string) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    // Handler for Subject Select
    const handleSubjectSelect = (val: string) => {
        setSelectedSubjectId(val);
    };

    // Handler for Component Select
    const handleComponentSelect = (val: string) => {
        setSelectedComponentSlug(val);
    };

    // ✅ Manual insert (multiple contents allowed per component)
    const handleManualUpload = async () => {
        const { practical_subject_id, component_slug, title, content_html } = formData;

        // This check ensures a component is selected and the fields are not just whitespace
        if (!practical_subject_id || !component_slug || !title.trim()) {
            toast.error("Please select subject, component and provide a non-empty title.");
            return;
        }

        const subj = subjects.find((s) => s.id === practical_subject_id);
        if (!subj) {
            toast.error("Selected subject not found");
            return;
        }

        // Validate component_slug against subject's allowed components
        let parsed: ComponentMeta[] = [];
        try {
            parsed = Array.isArray(subj.practical_components)
                ? subj.practical_components
                : JSON.parse(subj.practical_components || "[]");
        } catch {
            parsed = [];
        }

        const allowedSlugs = parsed.map((c) => c.slug);
        if (!allowedSlugs.includes(component_slug)) {
            toast.error("Selected component is not defined for the chosen subject");
            return;
        }

        setUploading(true);
        // The core functionality to insert new content
        const { error } = await supabase.from("practical_notes_content").insert([
            {
                practical_subject_id,
                component_slug,
                title,
                content_html,
            },
        ]);
        setUploading(false);

        if (error) {
            console.error(error);
            toast.error("Failed to save content");
        } else {
            toast.success("Content added successfully");
            // Crucial: Only clear title and content, keeping subject/component selected for quick subsequent entries
            setFormData((prev) => ({ ...prev, title: "", content_html: "" }));
        }
    };

    // Resets form fields for a new manual entry
    const handleManualReset = () => {
        setFormData((p) => ({ ...p, title: "", content_html: "" }));
        toast.info("Title and Content cleared, Subject and Component remain selected.");
    }

    // ✅ CSV upload (multiple entries allowed) - Logic is already robust
    const handleCSVUpload = async () => {
        if (!csvFile) {
            toast.error("Please choose a CSV file");
            return;
        }

        setUploading(true);
        Papa.parse(csvFile, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const parsedRows: any[] = results.data as any[];

                const toInsert: any[] = [];
                const invalidRows: { rowIndex: number; reason: string }[] = [];

                for (let i = 0; i < parsedRows.length; i++) {
                    const row = parsedRows[i];
                    const sId = row.practical_subject_id?.trim();
                    const slug = row.component_slug?.trim();
                    const title = row.title?.trim();
                    const content_html = row.content_html ?? "";

                    if (!sId || !slug || !title) {
                        invalidRows.push({
                            rowIndex: i + 1,
                            reason: "Missing required fields (subject/component/title)",
                        });
                        continue;
                    }

                    const subj = subjects.find((s) => s.id === sId);
                    if (!subj) {
                        invalidRows.push({
                            rowIndex: i + 1,
                            reason: "Subject ID not found in system",
                        });
                        continue;
                    }

                    let parsed: ComponentMeta[] = [];
                    try {
                        parsed = Array.isArray(subj.practical_components)
                            ? subj.practical_components
                            : JSON.parse(subj.practical_components || "[]");
                    } catch {
                        parsed = [];
                    }

                    const allowed = parsed.map((c) => c.slug);
                    if (!allowed.includes(slug)) {
                        invalidRows.push({
                            rowIndex: i + 1,
                            reason: `Component slug "${slug}" not allowed for subject ${subj.name}`,
                        });
                        continue;
                    }

                    toInsert.push({
                        practical_subject_id: sId,
                        component_slug: slug,
                        title,
                        content_html,
                    });
                }

                if (toInsert.length === 0) {
                    setUploading(false);
                    toast.error(
                        `No valid rows to upload. ${invalidRows.length} invalid rows.`
                    );
                    console.warn("CSV invalid rows:", invalidRows);
                    return;
                }

                // 🔥 Insert instead of upsert (multiple entries allowed)
                const { error } = await supabase
                    .from("practical_notes_content")
                    .insert(toInsert);

                setUploading(false);
                if (error) {
                    console.error(error);
                    toast.error("Bulk upload failed");
                } else {
                    toast.success(
                        `Uploaded ${toInsert.length} rows. ${invalidRows.length} invalid rows skipped.`
                    );
                    if (invalidRows.length) console.warn("Invalid CSV rows:", invalidRows);
                }
            },
            error: (err) => {
                setUploading(false);
                console.error(err);
                toast.error("Failed to parse CSV");
            },
        });
    };

    if (loading) return <div className="p-6">Loading...</div>;

    // --- Render ---

    return (
        <AdminLockout>
            <div className="p-6 space-y-8">
                <AdminHeader title="Upload / Insert Practical Notes Content" />

                {/* Manual Upload / Insert */}
                <Card>
                    <CardHeader>
                        <CardTitle>Manual Entry (Insert multiple contents)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Select
                            value={selectedSubjectId}
                            onValueChange={handleSubjectSelect}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Subject" />
                            </SelectTrigger>
                            <SelectContent>
                                {subjects.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={selectedComponentSlug}
                            onValueChange={handleComponentSelect}
                            disabled={!components.length}
                        >
                            <SelectTrigger>
                                <SelectValue
                                    placeholder={
                                        components.length ? "Select component" : "Select a subject first"
                                    }
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {components.length > 0 ? (
                                    components.map((c) => (
                                        <SelectItem key={c.slug} value={c.slug}>
                                            {c.name} —{" "}
                                            <span className="text-xs text-muted-foreground">
                                                {c.slug}
                                            </span>
                                        </SelectItem>
                                    ))
                                ) : (
                                    <div className="p-2 text-sm text-gray-500">
                                        No components defined for this subject.
                                    </div>
                                )}
                            </SelectContent>
                        </Select>

                        <Input
                            placeholder="Title"
                            value={formData.title}
                            onChange={(e) => handleFormChange("title", e.target.value)}
                        />

                        <Textarea
                            placeholder="Content HTML (e.g., <p>Step-by-step instructions...</p>)"
                            rows={8}
                            value={formData.content_html}
                            onChange={(e) => handleFormChange("content_html", e.target.value)}
                        />

                        <div className="flex gap-3">
                            <Button
                                onClick={handleManualUpload}
                                disabled={
                                    uploading || !selectedSubjectId || !selectedComponentSlug || !formData.title.trim()
                                }
                            >
                                {uploading ? "Saving..." : "Add Content"}
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={handleManualReset}
                            >
                                Reset Content Fields
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSelectedSubjectId("");
                                    setSelectedComponentSlug("");
                                }}
                            >
                                Reset All Selections
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* CSV Upload */}
                <Card>
                    <CardHeader>
                        <CardTitle>Bulk Upload (CSV)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="text-sm text-gray-600 mb-2">
                                CSV must have headers:{" "}
                                <code>
                                    practical_subject_id,component_slug,title,content_html
                                </code>
                            </div>
                            <Input
                                type="file"
                                accept=".csv"
                                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button onClick={handleCSVUpload} disabled={uploading || !csvFile}>
                                {uploading ? "Uploading..." : "Upload CSV"}
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    toast(`
CSV example:
practical_subject_id,component_slug,title,content_html
<uuid-of-subject-1>,blood_smear,"Step 1: Prep","<p>Prepare slide...</p>"
<uuid-of-subject-1>,blood_smear,"Step 2: Stain","<p>Stain with Giemsa...</p>"
<uuid-of-subject-2>,urine_analysis,"Procedure 1","<p>Collect sample...</p>"
                            `);
                                }}
                            >
                                CSV Example
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLockout>
    );
}