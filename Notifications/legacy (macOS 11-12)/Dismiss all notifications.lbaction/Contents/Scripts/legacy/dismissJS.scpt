JsOsaDAS1.001.00bplist00�Vscripto� / /   h t t p s : / / w w w . r e d d i t . c o m / r / a p p l e s c r i p t / c o m m e n t s / j x h m 1 9 / c l e a r _ a l l _ n o t i f i c a t i o n s _ w i t h _ s i n g l e _ s c r i p t _ o n _ b i g / g i g 3 p h d / 
 / /   h t t p s : / / g i s t . g i t h u b . c o m / l a n c e t h o m p s / a 5 a c 1 0 3 f 3 3 4 b 1 7 1 f 7 0 c e 2 f f 9 8 3 2 2 0 b 4 f 
 / /   h t t p s : / / g i t h u b . c o m / p r e n a g h a / l a u n c h b a r / b l o b / m a i n / D i s m i s s % 2 0 N o t i f i c a t i o n s . l b a c t i o n / C o n t e n t s / S c r i p t s / d i s m i s s . a p p l e s c r i p t 
 
 
 f u n c t i o n   r u n ( i n p u t ,   p a r a m e t e r s )   { 
 
 
         t r y   { 
 
 
                 c o n s t   a p p N a m e   =   " " ; 
                 c o n s t   v e r b o s e   =   t r u e ; 
 
                 c o n s t   n o t N u l l   =   ( v a l )   = >   { 
                         r e t u r n   v a l   ! = =   n u l l   & &   v a l   ! = =   u n d e f i n e d ; 
                 } 
 
                 c o n s t   i s N u l l   =   ( v a l )   = >   { 
                         r e t u r n   ! n o t N u l l ( v a l ) ; 
                 } 
 
                 c o n s t   h a s A p p N a m e   =   n o t N u l l ( a p p N a m e )   & &   a p p N a m e   ! = =   " " ; 
                 c o n s t   a p p N a m e F o r L o g   =   h a s A p p N a m e   ?   `   [ $ { a p p N a m e } ] `   :   " " ; 
 
                 c o n s t   l o g s   =   [ ] ; 
                 c o n s t   l o g   =   ( m e s s a g e ,   . . . o p t i o n a l P a r a m s )   = >   { 
                         l e t   m e s s a g e _ w i t h _ p r e f i x   =   ` $ { n e w   D a t e ( ) . t o I S O S t r i n g ( ) . r e p l a c e A l l ( " Z " ,   " " ) . r e p l a c e A l l ( " T " ,   "   " ) }   [ c l o s e _ n o t i f i c a t i o n s ] $ { a p p N a m e F o r L o g }   $ { m e s s a g e } ` ; 
                         c o n s o l e . l o g ( m e s s a g e _ w i t h _ p r e f i x ,   o p t i o n a l P a r a m s ) ; 
                         l o g s . p u s h ( m e s s a g e _ w i t h _ p r e f i x ) ; 
                 } 
 
                 c o n s t   l o g E r r o r   =   ( m e s s a g e ,   . . . o p t i o n a l P a r a m s )   = >   { 
                         l o g ( ` E R R O R   $ { m e s s a g e } ` ,   o p t i o n a l P a r a m s ) ; 
                 } 
 
                 c o n s t   l o g E r r o r V e r b o s e   =   ( m e s s a g e ,   . . . o p t i o n a l P a r a m s )   = >   { 
                         i f   ( v e r b o s e )   { 
                                 l o g ( ` E R R O R   $ { m e s s a g e } ` ,   o p t i o n a l P a r a m s ) ; 
                         } 
                 } 
 
                 c o n s t   l o g V e r b o s e   =   ( m e s s a g e )   = >   { 
                         i f   ( v e r b o s e )   { 
                                 l o g ( m e s s a g e ) ; 
                         } 
                 } 
 
                 c o n s t   g e t L o g L i n e s   =   ( )   = >   { 
                         r e t u r n   l o g s . j o i n ( " \ n " ) ; 
                 } 
 
                 c o n s t   g e t S y s t e m E v e n t s   =   ( )   = >   { 
                         l e t   s y s t e m E v e n t s   =   A p p l i c a t i o n ( " S y s t e m   E v e n t s " ) ; 
                         s y s t e m E v e n t s . i n c l u d e S t a n d a r d A d d i t i o n s   =   t r u e ; 
                         r e t u r n   s y s t e m E v e n t s ; 
                 } 
 
                 c o n s t   g e t N o t i f i c a t i o n C e n t e r   =   ( )   = >   { 
                         r e t u r n   g e t S y s t e m E v e n t s ( ) . p r o c e s s e s . b y N a m e ( " N o t i f i c a t i o n C e n t e r " ) ; 
                 } 
 
                 c o n s t   g e t N o t i f i c a t i o n C e n t e r G r o u p s   =   ( )   = >   { 
                         l e t   n o t i f i c a t i o n C e n t e r   =   g e t N o t i f i c a t i o n C e n t e r ( ) ; 
                         i f   ( n o t i f i c a t i o n C e n t e r . w i n d o w s . l e n g t h   < =   0 )   { 
                                 r e t u r n   [ ] ; 
                         } 
                         r e t u r n   n o t i f i c a t i o n C e n t e r . w i n d o w s [ 0 ] . u i E l e m e n t s [ 0 ] . u i E l e m e n t s [ 0 ] . u i E l e m e n t s ( ) ; 
                 } 
 
                 c o n s t   n o t i f i c a t i o n G r o u p M a t c h e s   =   ( g r o u p )   = >   { 
                         i f   ( ! h a s A p p N a m e )   { 
                                 r e t u r n   t r u e ; 
                         } 
 
                         t r y   { 
                                 f o r   ( l e t   e l e m   o f   g r o u p . u i E l e m e n t s ( ) )   { 
                                         i f   ( h a s A p p N a m e   & &   e l e m . r o l e ( )   = = =   " A X S t a t i c T e x t "   & &   e l e m . v a l u e ( ) . t o L o w e r C a s e ( )   = = =   a p p N a m e . t o L o w e r C a s e ( ) )   { 
                                                 r e t u r n   t r u e ; 
                                         } 
                                 } 
                         }   c a t c h   ( e r r )   { 
                                 l o g E r r o r V e r b o s e ( ` C a u g h t   e r r o r   w h i l e   c h e c k i n g   w i n d o w ,   w i n d o w   i s   p r o b a b l y   c l o s e d :   $ { e r r } ` ) ; 
                                 l o g E r r o r V e r b o s e ( e r r ) ; 
                         } 
                         r e t u r n   f a l s e ; 
                 } 
 
                 c o n s t   C L E A R _ A L L _ A C T I O N   =   " A l l e   e n t f e r n e n " ; 
                 c o n s t   C L O S E _ A C T I O N   =   " S c h l i e � e n " ; 
 
                 c o n s t   f i n d C l o s e A c t i o n   =   ( g r o u p ,   c l o s e d C o u n t )   = >   { 
                         t r y   { 
                                 l e t   c l e a r A l l A c t i o n ; 
                                 l e t   c l o s e A c t i o n ; 
                                 f o r   ( l e t   a c t i o n   o f   g r o u p . a c t i o n s ( ) )   { 
                                         i f   ( a c t i o n . d e s c r i p t i o n ( )   = = =   C L E A R _ A L L _ A C T I O N )   { 
                                                 c l e a r A l l A c t i o n   =   a c t i o n ; 
                                                 b r e a k ; 
                                         }   e l s e   i f   ( a c t i o n . d e s c r i p t i o n ( )   = = =   C L O S E _ A C T I O N )   { 
                                                 c l o s e A c t i o n   =   a c t i o n ; 
                                         } 
                                 } 
                                 i f   ( n o t N u l l ( c l e a r A l l A c t i o n ) )   { 
                                         r e t u r n   c l e a r A l l A c t i o n ; 
                                 }   e l s e   i f   ( n o t N u l l ( c l o s e A c t i o n ) )   { 
                                         r e t u r n   c l o s e A c t i o n ; 
                                 } 
                         }   c a t c h   ( e r r )   { 
                                 l o g E r r o r V e r b o s e ( ` ( g r o u p _ $ { c l o s e d C o u n t } )   C a u g h t   e r r o r   w h i l e   s e a r c h i n g   f o r   c l o s e   a c t i o n ,   w i n d o w   i s   p r o b a b l y   c l o s e d :   $ { e r r } ` ) ; 
                                 l o g E r r o r V e r b o s e ( e r r ) ; 
                                 r e t u r n   n u l l ; 
                         } 
                         l o g ( " N o   c l o s e   a c t i o n   f o u n d   f o r   n o t i f i c a t i o n " ) ; 
                         r e t u r n   n u l l ; 
                 } 
 
                 c o n s t   c l o s e N e x t G r o u p   =   ( g r o u p s ,   c l o s e d C o u n t )   = >   { 
                         f o r   ( l e t   g r o u p   o f   g r o u p s )   { 
                                 i f   ( n o t i f i c a t i o n G r o u p M a t c h e s ( g r o u p ) )   { 
                                         l e t   c l o s e A c t i o n   =   f i n d C l o s e A c t i o n ( g r o u p ,   c l o s e d C o u n t ) ; 
 
                                         i f   ( n o t N u l l ( c l o s e A c t i o n ) )   { 
                                                 t r y   { 
                                                         c l o s e A c t i o n . p e r f o r m ( ) ; 
                                                         r e t u r n   [ t r u e ,   1 ] ; 
                                                 }   c a t c h   ( e r r )   { 
                                                         l o g E r r o r V e r b o s e ( ` ( g r o u p _ $ { c l o s e d C o u n t } )   C a u g h t   e r r o r   w h i l e   p e r f o r m i n g   c l o s e   a c t i o n ,   w i n d o w   i s   p r o b a b l y   c l o s e d :   $ { e r r } ` ) ; 
                                                         l o g E r r o r V e r b o s e ( e r r ) ; 
                                                 } 
                                         } 
                                         r e t u r n   [ t r u e ,   0 ] ; 
                                 } 
                         } 
                         r e t u r n   f a l s e ; 
                 } 
 
                 l e t   n o t i f i c a t i o n C e n t e r   =   g e t N o t i f i c a t i o n C e n t e r ( ) ; 
                 i f   ( n o t i f i c a t i o n C e n t e r . w i n d o w s . l e n g t h   < =   0 )   { 
                         l o g E r r o r ( " N o   n o t i f i c a t i o n s   f o u n d . " ) ; 
                         r e t u r n   g e t L o g L i n e s ( ) ; 
                 } 
 
                 l e t   g r o u p s C o u n t   =   g e t N o t i f i c a t i o n C e n t e r G r o u p s ( ) . f i l t e r ( g r o u p   = >   n o t i f i c a t i o n G r o u p M a t c h e s ( g r o u p ) ) . l e n g t h ; 
 
                 i f   ( g r o u p s C o u n t   >   0 )   { 
                         l o g V e r b o s e ( ` C l o s i n g   $ { g r o u p s C o u n t } $ { a p p N a m e F o r L o g }   n o t i f i c a t i o n   g r o u p $ { ( g r o u p s C o u n t   >   1   ?   " s "   :   " " ) } ` ) ; 
 
                         l e t   c l o s e d C o u n t   =   0 ; 
                         l e t   m a y b e M o r e   =   t r u e ; 
                         w h i l e   ( m a y b e M o r e )   { 
                                 l e t   c l o s e R e s u l t   =   c l o s e N e x t G r o u p ( g e t N o t i f i c a t i o n C e n t e r G r o u p s ( ) ,   c l o s e d C o u n t ) ; 
                                 m a y b e M o r e   =   c l o s e R e s u l t [ 0 ] ; 
                                 i f   ( m a y b e M o r e )   { 
                                         c l o s e d C o u n t   =   c l o s e d C o u n t   +   c l o s e R e s u l t [ 1 ] ; 
                                 } 
                         } 
                 }   e l s e   { 
                         t h r o w   E r r o r ( ` N o $ { a p p N a m e F o r L o g }   n o t i f i c a t i o n s   f o u n d . . . ` ) ; 
                 } 
 
                 r e t u r n   g e t L o g L i n e s ( ) ; 
         }   c a t c h   ( e r r o r )   { 
 
         } 
 }                              -fjscr  ��ޭ