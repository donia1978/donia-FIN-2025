-- Allow medical staff to create notifications for alerts
CREATE POLICY "Medical staff can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'medical_staff'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  auth.uid() = user_id
);