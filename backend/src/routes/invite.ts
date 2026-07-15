import { Router, Response } from 'express';
import { supabase } from '../lib/supabase';
import { validateToken, GuestRequest } from '../middleware/validateToken';

const router = Router();

router.get('/:token', validateToken, async (req: GuestRequest, res: Response) => {
    const guest = req.guest!;

    const { data: events, error } = await supabase
        .from('guest_events')
        .select(`
      event:events (
        id,
        slug,
        name,
        date,
        time_label,
        venue_name,
        is_visible
      )
    `)
        .eq('guest_id', guest.id)
        .eq('events.is_visible', true);

    if (error) {
        res.status(500).json({ error: 'Failed to fetch events' });
        return;
    }

    res.json({
        guest: {
            id: guest.id,
            name: guest.name,
            party_size: guest.party_size
        },
        events: events
            .map((e: any) => e.event)
            .filter(Boolean)
    });
});

router.get('/:token/rsvp-status', validateToken, async (req: GuestRequest, res: Response) => {
    const guest = req.guest!;

    const { data: rsvps, error } = await supabase
        .from('rsvps')
        .select('*')
        .eq('guest_id', guest.id);

    if (error) {
        res.status(500).json({ error: 'Failed to fetch RSVP status' });
        return;
    }

    res.json({
        submitted: rsvps.length > 0,
        responses: rsvps.map((r: any) => ({
            event_id: r.event_id,
            attending: r.attending
        }))
    });
});

router.post('/:token/rsvp', validateToken, async (req: GuestRequest, res: Response) => {
    const guest = req.guest!;

    // check if already submitted
    const { data: existing } = await supabase
        .from('rsvps')
        .select('id')
        .eq('guest_id', guest.id);

    if (existing && existing.length > 0) {
        res.status(409).json({ error: 'RSVP already submitted' });
        return;
    }

    const { responses } = req.body as {
        responses: { event_id: string; attending: boolean }[];
    };

    if (!responses || responses.length === 0) {
        res.status(400).json({ error: 'No responses provided' });
        return;
    }

    const rows = responses.map((r) => ({
        guest_id: guest.id,
        event_id: r.event_id,
        attending: r.attending
    }));

    const { error } = await supabase.from('rsvps').insert(rows);

    if (error) {
        res.status(500).json({ error: 'Failed to submit RSVP' });
        return;
    }

    res.json({ success: true });
});

router.get('/:token/venues', validateToken, async (req: GuestRequest, res: Response) => {
    const guest = req.guest!;

    const { data: events, error } = await supabase
        .from('guest_events')
        .select(`
      event:events (
        id,
        name,
        date,
        time_label,
        venue_name,
        venue_address,
        maps_url,
        directions_text
      )
    `)
        .eq('guest_id', guest.id)
        .eq('events.is_visible', true);

    if (error) {
        res.status(500).json({ error: 'Failed to fetch venues' });
        return;
    }

    res.json({
        venues: events
            .map((e: any) => e.event)
            .filter(Boolean)
    });
});

export default router;