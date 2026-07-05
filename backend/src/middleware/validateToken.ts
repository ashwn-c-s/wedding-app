import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

export interface GuestRequest extends Request {
    guest?: {
        id: string;
        name: string;
        phone: string;
        party_size: number;
        invite_token: string;
    };
}

export const validateToken = async (
    req: GuestRequest,
    res: Response,
    next: NextFunction
) => {
    const { token } = req.params;

    const { data: guest, error } = await supabase
        .from('guests')
        .select('*')
        .eq('invite_token', token)
        .single();

    if (error || !guest) {
        res.status(404).json({ error: 'Invalid invite link' });
        return;
    }

    req.guest = guest;
    next();
};