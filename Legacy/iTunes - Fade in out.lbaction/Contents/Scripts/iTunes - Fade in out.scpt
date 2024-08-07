FasdUAS 1.101.10   ��   ��    k             l      ��  ��    � � 
  db iTunes Fade-in/out
  By David Battino, Batmosphere.com
  Based on ideas from Doug's AppleScripts and Mac OS Hints
  
  This script fades out iTunes if it's playing and fades it in if it's stopped.
     � 	 	�   
     d b   i T u n e s   F a d e - i n / o u t 
     B y   D a v i d   B a t t i n o ,   B a t m o s p h e r e . c o m 
     B a s e d   o n   i d e a s   f r o m   D o u g ' s   A p p l e S c r i p t s   a n d   M a c   O S   H i n t s 
     
     T h i s   s c r i p t   f a d e s   o u t   i T u n e s   i f   i t ' s   p l a y i n g   a n d   f a d e s   i t   i n   i f   i t ' s   s t o p p e d . 
   
  
 l     ��������  ��  ��        l     ��  ��      edited by Ptujec     �   "   e d i t e d   b y   P t u j e c      l     ��������  ��  ��        l     ��  ��      2012-11-08     �      2 0 1 2 - 1 1 - 0 8      l     ��  ��      + show rating     �      +   s h o w   r a t i n g      l     ��   ��    3 - + display info also for streams and podcasts      � ! ! Z   +   d i s p l a y   i n f o   a l s o   f o r   s t r e a m s   a n d   p o d c a s t s   " # " l     �� $ %��   $ 4 . + Notification Center support (via LaunchBar)    % � & & \   +   N o t i f i c a t i o n   C e n t e r   s u p p o r t   ( v i a   L a u n c h B a r ) #  ' ( ' l     ��������  ��  ��   (  ) * ) l     �� + ,��   +   2014-06-19    , � - -    2 0 1 4 - 0 6 - 1 9 *  . / . l     �� 0 1��   0 N H - removed Notifications because iTunes is doing this now out of the box    1 � 2 2 �   -   r e m o v e d   N o t i f i c a t i o n s   b e c a u s e   i T u n e s   i s   d o i n g   t h i s   n o w   o u t   o f   t h e   b o x /  3 4 3 l     �� 5 6��   5   + some cleanup for LB6    6 � 7 7 .   +   s o m e   c l e a n u p   f o r   L B 6 4  8 9 8 l     ��������  ��  ��   9  : ; : l     ��������  ��  ��   ;  < = < l     ��������  ��  ��   =  >�� > l    � ?���� ? Q     � @ A B @ k    w C C  D E D l   ��������  ��  ��   E  F G F O    u H I H k    t J J  K L K l   ��������  ��  ��   L  M N M r     O P O l   
 Q���� Q 1    
��
�� 
pVol��  ��   P o      ���� 0 currentvolume   N  R S R Z    r T U�� V T =    W X W 1    ��
�� 
pPlS X m    ��
�� ePlSkPSP U T    G Y Y k    B Z Z  [ \ [ l   �� ] ^��   ]  
Fade down	    ^ � _ _  F a d e   d o w n 	 \  ` a ` Y    4 b�� c d e b l  $ / f g h f k   $ / i i  j k j r   $ ) l m l o   $ %���� 0 i   m l      n���� n 1   % (��
�� 
pVol��  ��   k  o�� o l  * / p q r p I  * /�� s��
�� .sysodelanull��� ��� nmbr s m   * + t t ?���������   q O I Adjust this to change fadeout duration (delete this line on slower Macs)    r � u u �   A d j u s t   t h i s   t o   c h a n g e   f a d e o u t   d u r a t i o n   ( d e l e t e   t h i s   l i n e   o n   s l o w e r   M a c s )��   g  try by -4 on slower Macs    h � v v 0 t r y   b y   - 4   o n   s l o w e r   M a c s�� 0 i   c o    ���� 0 currentvolume   d m    ����   e m     ������ a  w x w I  5 :������
�� .hookPausnull        null��  ��   x  y z y l  ; ;�� { |��   {  Restore original volume    | � } } . R e s t o r e   o r i g i n a l   v o l u m e z  ~  ~ r   ; @ � � � o   ; <���� 0 currentvolume   � l      ����� � 1   < ?��
�� 
pVol��  ��     ��� �  S   A B��  ��   V l  J r � � � � k   J r � �  � � � l  J J��������  ��  ��   �  � � � l  J O � � � � r   J O � � � m   J K����   � l      ����� � 1   K N��
�� 
pVol��  ��   � 4 .2007-03-20 script update to fix startup glitch    � � � � \ 2 0 0 7 - 0 3 - 2 0   s c r i p t   u p d a t e   t o   f i x   s t a r t u p   g l i t c h �  � � � I  P U������
�� .hookPlaynull    ��� obj ��  ��   �  � � � l  V V��������  ��  ��   �  � � � l  V V�� � ���   � S M tell application "System Events" to set visible of process "iTunes" to false    � � � � �   t e l l   a p p l i c a t i o n   " S y s t e m   E v e n t s "   t o   s e t   v i s i b l e   o f   p r o c e s s   " i T u n e s "   t o   f a l s e �  � � � l  V V��������  ��  ��   �  � � � l  V V�� � ���   �   reveal current track    � � � � *   r e v e a l   c u r r e n t   t r a c k �  � � � l  V V��������  ��  ��   �  � � � Y   V p ��� � � � � l  ` k � � � � k   ` k � �  � � � r   ` e � � � o   ` a���� 0 j   � l      ����� � 1   a d��
�� 
pVol��  ��   �  ��� � l  f k � � � � I  f k�� ���
�� .sysodelanull��� ��� nmbr � m   f g � � ?���������   � P J Adjust this to change fadeout duration (delete this line on slower Macs)	    � � � � �   A d j u s t   t h i s   t o   c h a n g e   f a d e o u t   d u r a t i o n   ( d e l e t e   t h i s   l i n e   o n   s l o w e r   M a c s ) 	��   �  try by 4 on slower Macs    � � � � . t r y   b y   4   o n   s l o w e r   M a c s�� 0 j   � m   Y Z����   � o   Z [���� 0 currentvolume   � m   [ \����  �  � � � l  q q��������  ��  ��   �  ��� � l  q q��������  ��  ��  ��   � %  if player state is paused then    � � � � >   i f   p l a y e r   s t a t e   i s   p a u s e d   t h e n S  ��� � l  s s��������  ��  ��  ��   I m     � ��                                                                                  hook  alis    P  Macintosh SSD              ̸I�H+   ���
iTunes.app                                                      S<��'�        ����  	                Applications    ̸;�      ��r     ���  &Macintosh SSD:Applications: iTunes.app   
 i T u n e s . a p p    M a c i n t o s h   S S D  Applications/iTunes.app   / ��   G  ��� � l  v v��������  ��  ��  ��   A R      �� ���
�� .ascrerr ****      � **** � o      ���� 0 e  ��   B O   � � � � I  � ����� �
�� .odlbnocenull���     ctxt��   � �� � �
�� 
pttl � m   � � � � � � �  E r r o r ! � �� ���
�� 
pstl � o   � ����� 0 e  ��   � m    � � ��                                                                                  ODLB  alis    \  Macintosh SSD              ̸I�H+   ���LaunchBar.app                                                  �@��P        ����  	                Applications    ̸;�      ���0     ���  )Macintosh SSD:Applications: LaunchBar.app     L a u n c h B a r . a p p    M a c i n t o s h   S S D  Applications/LaunchBar.app  / ��  ��  ��  ��       �� � ���   � ��
�� .aevtoappnull  �   � **** � �� ����� � ���
�� .aevtoappnull  �   � **** � k     � � �  >����  ��  ��   � ��~�}� 0 i  �~ 0 j  �} 0 e   �  ��|�{�z�y�x t�w�v�u�t�s�r ��q ��p�o�n
�| 
pVol�{ 0 currentvolume  
�z 
pPlS
�y ePlSkPSP�x��
�w .sysodelanull��� ��� nmbr
�v .hookPausnull        null
�u .hookPlaynull    ��� obj �t �s 0 e  �r  
�q 
pttl
�p 
pstl�o 
�n .odlbnocenull���     ctxt�� � y� o*�,E�O*�,�  7 1hZ �j�h  �*�,FO�j [OY��O*j O�*�,FO[OY��Y *j*�,FO*j 	O j��h �*�,FO�j [OY��OPOPUOPW X  � *��a �a  U ascr  ��ޭ