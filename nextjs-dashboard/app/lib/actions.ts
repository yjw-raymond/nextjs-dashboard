'use server';

import { z } from 'zod';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type State = {
    errors?: {
        customerId?: string[];
        amount?: string[];
        status?: string[];
    };
    message?: string | null;
};

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Please select a customer.',
    }),
    amount: z.coerce
        .number()
        .gt(0, { message: 'Please enter an amount greater than $0.' }),
    status: z.enum(['pending', 'paid'], {
        invalid_type_error: 'Please select an invoice status.',
    }),
    date: z.string(),
});

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const CreateInvoice = FormSchema.omit({ id: true, date: true });

const UpdateInvoice = FormSchema.omit({ id: true, date: true });

/* export async function createInvoice(formData: FormData) { */
export async function createInvoice(prevState: State, formData: FormData) {
    /*
    const rawFormData = {
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    };
    console.log(rawFormData);
    */
    /* console.log(typeof rawFormData.amount); */

    /*
    const { customerId, amount, status } = CreateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });
    */
    const validateFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    // If form validation fails, return errors early, Ohterwise, continue
    if (!validateFields.success) {
        //console.log('Error createInvoice...');
        return {
          errors: validateFields.error.flatten().fieldErrors,
          message: 'Missing Fields. Failed to Create Invoice.',  
        };
    }

    // Prepare data for insertion into the database
    const { customerId, amount, status } = validateFields.data;

    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    /*
    console.log('customerId... ', customerId);
    console.log('amount...', amount);
    console.log('status....', status);
    console.log('date...', date);
    */

    try {
        await sql`
            INSERT INTO invoices (customer_id, amount, status, date)
            VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `;
    } catch (error) {
        // If a database error occurs, return a more specific error.
        // console.error(error);
        return {
            message: 'Database Error: Failed to Create Invoice.',
        };

    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

/* export async function updateInvoice(id: string, formData: FormData) { */
export async function updateInvoice(
    id: string,
    prevState: State,
    formData: FormData,
) {
    /*
    const { customerId, amount, status } = UpdateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });
    */

    const validateFields = UpdateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });
    
    if (!validateFields.success) {
        return {
            errors: validateFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Update Invoice.',
        };
    }

    const { customerId, amount, status } = validateFields.data;
    const amountInCents = amount * 100;

    try {
        await sql`
            UPDATE invoices
            SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
            WHERE id = ${id}
        `;
    } catch (error) {
        return { message: 'Database Error: Failed to Update Invoice.'};
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    // throw new Error('Failed to Delete Invoice');

    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');
}
