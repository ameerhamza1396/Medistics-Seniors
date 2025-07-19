import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner'; // Assuming you have shadcn/ui toast or similar for notifications
import { Loader2, PlusCircle, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query'; // Import useQuery

// Define interfaces for data structures
interface PricingPlan {
    id: string;
    name: string;
    display_name: string;
    type: 'monthly' | 'yearly';
    currency: 'PKR' | 'USD';
    price: number;
    original_price: number | null;
    features: string[];
    is_popular: boolean;
    order: number;
}

interface PromoCode {
    id: string;
    code: string;
    discount_type: 'percentage' | 'flat';
    discount_value: number;
    currency_specific: 'PKR' | 'USD' | null;
    min_amount: number | null;
    max_uses: number | null;
    current_uses: number;
    valid_from: string | null;
    valid_until: string | null;
    active: boolean;
}

const Admin11 = () => {
    const { user, isLoading: isAuthLoading } = useAuth();
    const navigate = useNavigate();

    // State to control access blocked screen
    const [accessBlocked, setAccessBlocked] = useState(false);

    // Use useQuery to fetch user profile data, including the role
    const { data: profile, isLoading: isProfileLoading } = useQuery<{ role: string } | null>({
        queryKey: ['adminProfileRole', user?.id], // Unique query key
        queryFn: async () => {
            if (!user?.id) return null; // If no user, no profile to fetch

            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle();

            if (error) {
                console.error('Error fetching user role for admin panel:', error);
                // Do not set global error state here, as useQuery handles it internally
                return null;
            }
            return data;
        },
        // Only enable this query if the user object is available (i.e., not loading auth)
        enabled: !!user && !isAuthLoading,
        // Keep data fresh, but not too aggressive for a role that changes rarely
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
    });

    const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [error, setError] = useState<string | null>(null); // For general data fetching errors

    // Dialog states for Pricing Plans
    const [showAddPlanDialog, setShowAddPlanDialog] = useState(false);
    const [showEditPlanDialog, setShowEditPlanDialog] = useState(false);
    const [currentPlan, setCurrentPlan] = useState<PricingPlan | null>(null);
    const [newPlanData, setNewPlanData] = useState<Partial<PricingPlan>>({
        name: '',
        display_name: '',
        type: 'monthly',
        currency: 'PKR',
        price: 0,
        original_price: null,
        features: [],
        is_popular: false,
        order: 0,
    });

    // Dialog states for Promo Codes
    const [showAddPromoDialog, setShowAddPromoDialog] = useState(false);
    const [showEditPromoDialog, setShowEditPromoDialog] = useState(false);
    const [currentPromo, setCurrentPromo] = useState<PromoCode | null>(null);
    const [newPromoData, setNewPromoData] = useState<Partial<PromoCode>>({
        code: '',
        discount_type: 'percentage',
        discount_value: 0,
        currency_specific: null,
        min_amount: null,
        max_uses: null,
        valid_from: null,
        valid_until: null,
        active: true,
    });

    const [isSubmitting, setIsSubmitting] = useState(false); // For form submission loading

    // --- Access Control Logic ---
    useEffect(() => {
        // Wait for both auth and profile to finish loading
        if (isAuthLoading || isProfileLoading) {
            return;
        }

        // If user is not logged in, block access
        if (!user) {
            setAccessBlocked(true);
            return;
        }

        // If user is logged in but not an admin, block access
        if (profile?.role !== 'admin') {
            setAccessBlocked(true);
        } else {
            // If user is admin, ensure access is not blocked
            setAccessBlocked(false);
        }
    }, [user, isAuthLoading, isProfileLoading, profile, navigate]);


    // --- Fetch Data (Pricing Plans & Promo Codes) ---
    const fetchData = useCallback(async () => {
        setDataLoading(true);
        setError(null); // Clear previous errors
        try {
            // Fetch Pricing Plans
            // Ensure RLS policies in Supabase allow SELECT for 'pricing_plans' table for authenticated users (or 'admin' role)
            const { data: plansData, error: plansError } = await supabase
                .from('pricing_plans')
                .select('*')
                .order('order', { ascending: true });

            if (plansError) throw plansError;
            setPricingPlans(plansData as PricingPlan[]);

            // Fetch Promo Codes
            // Ensure RLS policies in Supabase allow SELECT for 'promo_codes' table for authenticated users (or 'admin' role)
            const { data: promoData, error: promoError } = await supabase
                .from('promo_codes')
                .select('*')
                .order('code', { ascending: true });

            if (promoError) throw promoError;
            setPromoCodes(promoData as PromoCode[]);

        } catch (err: any) {
            console.error('Error fetching data:', err);
            setError(`Failed to load data: ${err.message}`);
            toast.error(`Failed to load data: ${err.message}`);
        } finally {
            setDataLoading(false);
        }
    }, []);

    // Fetch data only when profile is confirmed to be 'admin' AND access is not blocked
    useEffect(() => {
        if (profile?.role === 'admin' && !accessBlocked) {
            fetchData();
        }
    }, [profile, fetchData, accessBlocked]); // Depend on profile and accessBlocked


    // --- Pricing Plan Handlers ---
    const handleAddPlan = async () => {
        setIsSubmitting(true);
        try {
            // Basic validation
            if (!newPlanData.name || !newPlanData.display_name || !newPlanData.type || !newPlanData.currency || newPlanData.price === undefined) {
                throw new Error('Please fill all required fields for the plan.');
            }
            if (newPlanData.price < 0 || (newPlanData.original_price !== null && newPlanData.original_price < 0)) {
                throw new Error('Prices cannot be negative.');
            }
            if (newPlanData.original_price !== null && newPlanData.original_price < newPlanData.price) {
                throw new Error('Original price cannot be less than the current price.');
            }

            // Ensure RLS policies in Supabase allow INSERT for 'pricing_plans' table for 'admin' role
            const { error: insertError } = await supabase
                .from('pricing_plans')
                .insert([newPlanData]);

            if (insertError) throw insertError;

            toast.success('Pricing plan added successfully!');
            setShowAddPlanDialog(false);
            setNewPlanData({ name: '', display_name: '', type: 'monthly', currency: 'PKR', price: 0, original_price: null, features: [], is_popular: false, order: 0 }); // Reset form
            fetchData(); // Refresh data
        } catch (err: any) {
            console.error('Error adding plan:', err);
            toast.error(`Failed to add plan: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditPlan = async () => {
        setIsSubmitting(true);
        if (!currentPlan) return;
        try {
            // Basic validation
            if (!currentPlan.name || !currentPlan.display_name || !currentPlan.type || !currentPlan.currency || currentPlan.price === undefined) {
                throw new Error('Please fill all required fields for the plan.');
            }
            if (currentPlan.price < 0 || (currentPlan.original_price !== null && currentPlan.original_price < 0)) {
                throw new Error('Prices cannot be negative.');
            }
            if (currentPlan.original_price !== null && currentPlan.original_price < currentPlan.price) {
                throw new Error('Original price cannot be less than the current price.');
            }

            // Ensure RLS policies in Supabase allow UPDATE for 'pricing_plans' table for 'admin' role
            const { error: updateError } = await supabase
                .from('pricing_plans')
                .update(currentPlan)
                .eq('id', currentPlan.id);

            if (updateError) throw updateError;

            toast.success('Pricing plan updated successfully!');
            setShowEditPlanDialog(false);
            setCurrentPlan(null); // Clear current plan
            fetchData(); // Refresh data
        } catch (err: any) {
            console.error('Error updating plan:', err);
            toast.error(`Failed to update plan: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeletePlan = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this pricing plan?')) return;
        setIsSubmitting(true);
        try {
            // Ensure RLS policies in Supabase allow DELETE for 'pricing_plans' table for 'admin' role
            const { error: deleteError } = await supabase
                .from('pricing_plans')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            toast.success('Pricing plan deleted successfully!');
            fetchData(); // Refresh data
        } catch (err: any) {
            console.error('Error deleting plan:', err);
            toast.error(`Failed to delete plan: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Promo Code Handlers ---
    const handleAddPromo = async () => {
        setIsSubmitting(true);
        try {
            // Basic validation
            if (!newPromoData.code || !newPromoData.discount_type || newPromoData.discount_value === undefined) {
                throw new Error('Please fill all required fields for the promo code.');
            }
            if (newPromoData.discount_value < 0) {
                throw new Error('Discount value cannot be negative.');
            }
            if (newPromoData.discount_type === 'percentage' && newPromoData.discount_value > 100) {
                throw new Error('Percentage discount cannot exceed 100%.');
            }
            if (newPromoData.valid_from && newPromoData.valid_until && new Date(newPromoData.valid_from) >= new Date(newPromoData.valid_until)) {
                throw new Error('Valid From date must be before Valid Until date.');
            }

            // Ensure RLS policies in Supabase allow INSERT for 'promo_codes' table for 'admin' role
            const { error: insertError } = await supabase
                .from('promo_codes')
                .insert([newPromoData]);

            if (insertError) throw insertError;

            toast.success('Promo code added successfully!');
            setShowAddPromoDialog(false);
            setNewPromoData({ code: '', discount_type: 'percentage', discount_value: 0, currency_specific: null, min_amount: null, max_uses: null, valid_from: null, valid_until: null, active: true }); // Reset form
            fetchData(); // Refresh data
        } catch (err: any) {
            console.error('Error adding promo code:', err);
            toast.error(`Failed to add promo code: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditPromo = async () => {
        setIsSubmitting(true);
        if (!currentPromo) return;
        try {
            // Basic validation
            if (!currentPromo.code || !currentPromo.discount_type || currentPromo.discount_value === undefined) {
                throw new Error('Please fill all required fields for the promo code.');
            }
            if (currentPromo.discount_value < 0) {
                throw new Error('Discount value cannot be negative.');
            }
            if (currentPromo.discount_type === 'percentage' && currentPromo.discount_value > 100) {
                throw new Error('Percentage discount cannot exceed 100%.');
            }
            if (currentPromo.valid_from && currentPromo.valid_until && new Date(currentPromo.valid_from) >= new Date(currentPromo.valid_until)) {
                throw new Error('Valid From date must be before Valid Until date.');
            }

            // Ensure RLS policies in Supabase allow UPDATE for 'promo_codes' table for 'admin' role
            const { error: updateError } = await supabase
                .from('promo_codes')
                .update(currentPromo)
                .eq('id', currentPromo.id);

            if (updateError) throw updateError;

            toast.success('Promo code updated successfully!');
            setShowEditPromoDialog(false);
            setCurrentPromo(null); // Clear current promo
            fetchData(); // Refresh data
        } catch (err: any) {
            console.error('Error updating promo code:', err);
            toast.error(`Failed to update promo code: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeletePromo = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this promo code?')) return;
        setIsSubmitting(true);
        try {
            // Ensure RLS policies in Supabase allow DELETE for 'promo_codes' table for 'admin' role
            const { error: deleteError } = await supabase
                .from('promo_codes')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            toast.success('Promo code deleted successfully!');
            fetchData(); // Refresh data
        } catch (err: any) {
            console.error('Error deleting promo code:', err);
            toast.error(`Failed to delete promo code: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Loading and Access Denied UI ---
    // Combined loading state for initial render
    if (isAuthLoading || isProfileLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
                <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading admin panel...
            </div>
        );
    }

    // Access Denied if user is not logged in or not an admin
    if (accessBlocked) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white p-4">
                <XCircle className="h-16 w-16 text-red-500 mb-4" />
                <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-6 text-center">
                    You do not have the necessary administrative privileges to view this page.
                </p>
                <Link to="/dashboard">
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white">Go to Dashboard</Button>
                </Link>
            </div>
        );
    }

    // If user is logged in and is an admin, render the full admin panel
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white p-4 sm:p-6 lg:p-8">
            <header className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200 dark:border-gray-800">
                <h1 className="text-3xl font-bold text-purple-700 dark:text-purple-300">Admin Dashboard</h1>
                <Link to="/dashboard">
                    <Button variant="outline">Back to Dashboard</Button>
                </Link>
            </header>

            {dataLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading data...
                </div>
            ) : error ? (
                <div className="text-center text-red-500 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 p-4 rounded-lg flex items-center justify-center">
                    <XCircle className="h-5 w-5 mr-2" />
                    <p className="font-medium">{error}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Pricing Plans Management */}
                    <Card className="shadow-lg dark:bg-gray-900/50 border-gray-200 dark:border-gray-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-2xl font-semibold">Pricing Plans</CardTitle>
                            <Button size="sm" onClick={() => setShowAddPlanDialog(true)}>
                                <PlusCircle className="h-4 w-4 mr-2" /> Add Plan
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Currency</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pricingPlans.map((plan) => (
                                        <TableRow key={plan.id}>
                                            <TableCell className="font-medium">{plan.display_name}</TableCell>
                                            <TableCell>{plan.type}</TableCell>
                                            <TableCell>{plan.currency}</TableCell>
                                            <TableCell>{plan.price}</TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => { setCurrentPlan(plan); setShowEditPlanDialog(true); }}
                                                    className="mr-2"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeletePlan(plan.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Promo Codes Management */}
                    <Card className="shadow-lg dark:bg-gray-900/50 border-gray-200 dark:border-gray-800">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-2xl font-semibold">Promo Codes</CardTitle>
                            <Button size="sm" onClick={() => setShowAddPromoDialog(true)}>
                                <PlusCircle className="h-4 w-4 mr-2" /> Add Promo
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Code</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Value</TableHead>
                                        <TableHead>Active</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {promoCodes.map((promo) => (
                                        <TableRow key={promo.id}>
                                            <TableCell className="font-medium">{promo.code}</TableCell>
                                            <TableCell>{promo.discount_type}</TableCell>
                                            <TableCell>{promo.discount_value}{promo.discount_type === 'percentage' ? '%' : ''}</TableCell>
                                            <TableCell>
                                                {promo.active ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => { setCurrentPromo(promo); setShowEditPromoDialog(true); }}
                                                    className="mr-2"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeletePromo(promo.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Add/Edit Pricing Plan Dialog */}
            {(showAddPlanDialog || showEditPlanDialog) && (
                <Dialog open={showAddPlanDialog || showEditPlanDialog} onOpenChange={showAddPlanDialog ? setShowAddPlanDialog : setShowEditPlanDialog}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{showAddPlanDialog ? 'Add New Pricing Plan' : 'Edit Pricing Plan'}</DialogTitle>
                            <DialogDescription>
                                {showAddPlanDialog ? 'Enter details for the new pricing plan.' : 'Edit the details of the selected pricing plan.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="plan-name" className="text-right">Name (Internal)</Label>
                                <Input
                                    id="plan-name"
                                    value={showAddPlanDialog ? newPlanData.name : currentPlan?.name || ''}
                                    onChange={(e) => showAddPlanDialog ? setNewPlanData({ ...newPlanData, name: e.target.value }) : setCurrentPlan(c => c ? { ...c, name: e.target.value } : null)}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="display-name" className="text-right">Display Name</Label>
                                <Input
                                    id="display-name"
                                    value={showAddPlanDialog ? newPlanData.display_name : currentPlan?.display_name || ''}
                                    onChange={(e) => showAddPlanDialog ? setNewPlanData({ ...newPlanData, display_name: e.target.value }) : setCurrentPlan(c => c ? { ...c, display_name: e.target.value } : null)}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="plan-type" className="text-right">Type</Label>
                                <Select
                                    value={showAddPlanDialog ? newPlanData.type : currentPlan?.type}
                                    onValueChange={(value: 'monthly' | 'yearly') => showAddPlanDialog ? setNewPlanData({ ...newPlanData, type: value }) : setCurrentPlan(c => c ? { ...c, type: value } : null)}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="yearly">Yearly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="plan-currency" className="text-right">Currency</Label>
                                <Select
                                    value={showAddPlanDialog ? newPlanData.currency : currentPlan?.currency}
                                    onValueChange={(value: 'PKR' | 'USD') => showAddPlanDialog ? setNewPlanData({ ...newPlanData, currency: value }) : setCurrentPlan(c => c ? { ...c, currency: value } : null)}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select currency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PKR">PKR</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="plan-price" className="text-right">Price</Label>
                                <Input
                                    id="plan-price"
                                    type="number"
                                    value={showAddPlanDialog ? (newPlanData.price ?? '') : (currentPlan?.price ?? '')} // Fix: Use nullish coalescing for number inputs
                                    onChange={(e) => showAddPlanDialog ? setNewPlanData({ ...newPlanData, price: parseFloat(e.target.value) || 0 }) : setCurrentPlan(c => c ? { ...c, price: parseFloat(e.target.value) || 0 } : null)} // Fix: Default to 0 if NaN
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="original-price" className="text-right">Original Price (Optional)</Label>
                                <Input
                                    id="original-price"
                                    type="number"
                                    value={showAddPlanDialog ? (newPlanData.original_price ?? '') : (currentPlan?.original_price ?? '')} // Fix: Use nullish coalescing
                                    onChange={(e) => showAddPlanDialog ? setNewPlanData({ ...newPlanData, original_price: e.target.value ? parseFloat(e.target.value) : null }) : setCurrentPlan(c => c ? { ...c, original_price: e.target.value ? parseFloat(e.target.value) : null } : null)}
                                    className="col-span-3"
                                    placeholder="Leave empty if no discount"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="features" className="text-right">Features (comma-separated)</Label>
                                <Textarea
                                    id="features"
                                    value={showAddPlanDialog ? newPlanData.features?.join(', ') || '' : currentPlan?.features.join(', ') || ''}
                                    onChange={(e) => {
                                        const featuresArray = e.target.value.split(',').map(f => f.trim()).filter(f => f.length > 0);
                                        showAddPlanDialog ? setNewPlanData({ ...newPlanData, features: featuresArray }) : setCurrentPlan(c => c ? { ...c, features: featuresArray } : null);
                                    }}
                                    className="col-span-3"
                                    placeholder="Feature 1, Feature 2, Feature 3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="is-popular" className="text-right">Is Popular</Label>
                                <Switch
                                    id="is-popular"
                                    checked={showAddPlanDialog ? newPlanData.is_popular : currentPlan?.is_popular}
                                    onCheckedChange={(checked) => showAddPlanDialog ? setNewPlanData({ ...newPlanData, is_popular: checked }) : setCurrentPlan(c => c ? { ...c, is_popular: checked } : null)}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="order" className="text-right">Order</Label>
                                <Input
                                    id="order"
                                    type="number"
                                    value={showAddPlanDialog ? (newPlanData.order ?? '') : (currentPlan?.order ?? '')} // Fix: Use nullish coalescing
                                    onChange={(e) => showAddPlanDialog ? setNewPlanData({ ...newPlanData, order: parseInt(e.target.value) || 0 }) : setCurrentPlan(c => c ? { ...c, order: parseInt(e.target.value) || 0 } : null)} // Fix: Default to 0 if NaN
                                    className="col-span-3"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => {
                                showAddPlanDialog ? setShowAddPlanDialog(false) : setShowEditPlanDialog(false);
                                setCurrentPlan(null); // Clear current plan on close
                                setNewPlanData({ name: '', display_name: '', type: 'monthly', currency: 'PKR', price: 0, original_price: null, features: [], is_popular: false, order: 0 }); // Reset add form
                            }}>
                                Cancel
                            </Button>
                            <Button onClick={showAddPlanDialog ? handleAddPlan : handleEditPlan} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                {showAddPlanDialog ? 'Add Plan' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Add/Edit Promo Code Dialog */}
            {(showAddPromoDialog || showEditPromoDialog) && (
                <Dialog open={showAddPromoDialog || showEditPromoDialog} onOpenChange={showAddPromoDialog ? setShowAddPromoDialog : setShowEditPromoDialog}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{showAddPromoDialog ? 'Add New Promo Code' : 'Edit Promo Code'}</DialogTitle>
                            <DialogDescription>
                                {showAddPromoDialog ? 'Enter details for the new promo code.' : 'Edit the details of the selected promo code.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="promo-code" className="text-right">Code</Label>
                                <Input
                                    id="promo-code"
                                    value={showAddPromoDialog ? newPromoData.code : currentPromo?.code || ''}
                                    onChange={(e) => showAddPromoDialog ? setNewPromoData({ ...newPromoData, code: e.target.value }) : setCurrentPromo(c => c ? { ...c, code: e.target.value } : null)}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="discount-type" className="text-right">Discount Type</Label>
                                <Select
                                    value={showAddPromoDialog ? newPromoData.discount_type : currentPromo?.discount_type}
                                    onValueChange={(value: 'percentage' | 'flat') => showAddPromoDialog ? setNewPromoData({ ...newPromoData, discount_type: value }) : setCurrentPromo(c => c ? { ...c, discount_type: value } : null)}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage">Percentage</SelectItem>
                                        <SelectItem value="flat">Flat</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="discount-value" className="text-right">Discount Value</Label>
                                <Input
                                    id="discount-value"
                                    type="number"
                                    value={showAddPromoDialog ? (newPromoData.discount_value ?? '') : (currentPromo?.discount_value ?? '')} // Fix: Use nullish coalescing
                                    onChange={(e) => showAddPromoDialog ? setNewPromoData({ ...newPromoData, discount_value: parseFloat(e.target.value) || 0 }) : setCurrentPromo(c => c ? { ...c, discount_value: parseFloat(e.target.value) || 0 } : null)} // Fix: Default to 0 if NaN
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="currency-specific" className="text-right">Currency Specific (Optional)</Label>
                                <Select
                                    value={showAddPromoDialog ? (newPromoData.currency_specific === null ? 'null_currency_option' : newPromoData.currency_specific) : (currentPromo?.currency_specific === null ? 'null_currency_option' : currentPromo?.currency_specific || 'null_currency_option')}
                                    onValueChange={(value: string) => { // Value will now be 'PKR', 'USD', or 'null_currency_option'
                                        const selectedCurrency = value === 'null_currency_option' ? null : (value as 'PKR' | 'USD');
                                        showAddPromoDialog
                                            ? setNewPromoData({ ...newPromoData, currency_specific: selectedCurrency })
                                            : setCurrentPromo(c => c ? { ...c, currency_specific: selectedCurrency } : null);
                                    }}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="All Currencies" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="null_currency_option">All Currencies</SelectItem> {/* Changed value */}
                                        <SelectItem value="PKR">PKR</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="min-amount" className="text-right">Min Amount (Optional)</Label>
                                <Input
                                    id="min-amount"
                                    type="number"
                                    value={showAddPromoDialog ? (newPromoData.min_amount ?? '') : (currentPromo?.min_amount ?? '')} // Fix: Use nullish coalescing
                                    onChange={(e) => showAddPromoDialog ? setNewPromoData({ ...newPromoData, min_amount: e.target.value ? parseFloat(e.target.value) : null }) : setCurrentPromo(c => c ? { ...c, min_amount: e.target.value ? parseFloat(e.target.value) : null } : null)}
                                    className="col-span-3"
                                    placeholder="No minimum"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="max-uses" className="text-right">Max Uses (Optional)</Label>
                                <Input
                                    id="max-uses"
                                    type="number"
                                    value={showAddPromoDialog ? (newPromoData.max_uses ?? '') : (currentPromo?.max_uses ?? '')} // Fix: Use nullish coalescing
                                    onChange={(e) => showAddPromoDialog ? setNewPromoData({ ...newPromoData, max_uses: e.target.value ? parseInt(e.target.value) : null }) : setCurrentPromo(c => c ? { ...c, max_uses: e.target.value ? parseInt(e.target.value) : null } : null)}
                                    className="col-span-3"
                                    placeholder="Unlimited"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="valid-from" className="text-right">Valid From (Optional)</Label>
                                <Input
                                    id="valid-from"
                                    type="datetime-local"
                                    value={showAddPromoDialog ? (newPromoData.valid_from ? newPromoData.valid_from.substring(0, 16) : '') : (currentPromo?.valid_from ? currentPromo.valid_from.substring(0, 16) : '')}
                                    onChange={(e) => showAddPromoDialog ? setNewPromoData({ ...newPromoData, valid_from: e.target.value ? new Date(e.target.value).toISOString() : null }) : setCurrentPromo(c => c ? { ...c, valid_from: e.target.value ? new Date(e.target.value).toISOString() : null } : null)}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="valid-until" className="text-right">Valid Until (Optional)</Label>
                                <Input
                                    id="valid-until"
                                    type="datetime-local"
                                    value={showAddPromoDialog ? (newPromoData.valid_until ? newPromoData.valid_until.substring(0, 16) : '') : (currentPromo?.valid_until ? currentPromo.valid_until.substring(0, 16) : '')}
                                    onChange={(e) => showAddPromoDialog ? setNewPromoData({ ...newPromoData, valid_until: e.target.value ? new Date(e.target.value).toISOString() : null }) : setCurrentPromo(c => c ? { ...c, valid_until: e.target.value ? new Date(e.target.value).toISOString() : null } : null)}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="promo-active" className="text-right">Active</Label>
                                <Switch
                                    id="promo-active"
                                    checked={showAddPromoDialog ? newPromoData.active : currentPromo?.active}
                                    onCheckedChange={(checked) => showAddPromoDialog ? setNewPromoData({ ...newPromoData, active: checked }) : setCurrentPromo(c => c ? { ...c, active: checked } : null)}
                                    className="col-span-3"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => {
                                showAddPromoDialog ? setShowAddPromoDialog(false) : setShowEditPromoDialog(false);
                                setCurrentPromo(null); // Clear current promo on close
                                setNewPromoData({ code: '', discount_type: 'percentage', discount_value: 0, currency_specific: null, min_amount: null, max_uses: null, valid_from: null, valid_until: null, active: true }); // Reset add form
                            }}>
                                Cancel
                            </Button>
                            <Button onClick={showAddPromoDialog ? handleAddPromo : handleEditPromo} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                {showAddPromoDialog ? 'Add Promo' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
};

export default Admin11;
